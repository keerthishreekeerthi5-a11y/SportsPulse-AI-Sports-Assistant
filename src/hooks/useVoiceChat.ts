import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types/chat';

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

interface UseVoiceChatOptions {
  onTranscriptTurn: (role: 'user' | 'assistant', text: string) => void;
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

/**
 * Downsamples Float32 audio from inputRate to 16kHz and encodes as 16-bit signed PCM base64.
 */
function encodeFloat32To16kPcmBase64(input: Float32Array, inputRate: number): {
  base64: string;
  rms: number;
} {
  let samples = input;
  if (inputRate > INPUT_SAMPLE_RATE) {
    const ratio = inputRate / INPUT_SAMPLE_RATE;
    const targetLength = Math.max(1, Math.floor(input.length / ratio));
    const downsampled = new Float32Array(targetLength);
    for (let i = 0; i < targetLength; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(input.length, Math.floor((i + 1) * ratio));
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += input[j];
        count++;
      }
      downsampled[i] = count > 0 ? sum / count : input[start] ?? 0;
    }
    samples = downsampled;
  }

  const pcmBuffer = new ArrayBuffer(samples.length * 2);
  const view = new DataView(pcmBuffer);
  let sumSquares = 0;

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    sumSquares += clamped * clamped;
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  const bytes = new Uint8Array(pcmBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return {
    base64: btoa(binary),
    rms: Math.sqrt(sumSquares / Math.max(1, samples.length)),
  };
}

/**
 * Decodes base64 16-bit little-endian PCM audio into normalized Float32 samples.
 */
function decodePcm16Base64ToFloat32(base64: string): {
  float32: Float32Array;
  rms: number;
} {
  const binary = atob(base64);
  const byteLength = binary.length;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const sampleCount = Math.floor(byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  const view = new DataView(bytes.buffer);
  let sumSquares = 0;

  for (let i = 0; i < sampleCount; i++) {
    const sample = view.getInt16(i * 2, true) / 32768;
    float32[i] = sample;
    sumSquares += sample * sample;
  }

  return {
    float32,
    rms: Math.sqrt(sumSquares / Math.max(1, sampleCount)),
  };
}

export function useVoiceChat({ onTranscriptTurn }: UseVoiceChatOptions) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveUserTranscript, setLiveUserTranscript] = useState('');
  const [liveModelTranscript, setLiveModelTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for audio callbacks to avoid stale closures
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const activeOutputNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const isMutedRef = useRef(false);
  const isReadyRef = useRef(false);
  const isConnectingRef = useRef(false);
  const userBufferRef = useRef('');
  const modelBufferRef = useRef('');
  const onTranscriptTurnRef = useRef(onTranscriptTurn);

  useEffect(() => {
    onTranscriptTurnRef.current = onTranscriptTurn;
  }, [onTranscriptTurn]);

  const stopOutputPlayback = useCallback(() => {
    for (const node of activeOutputNodesRef.current) {
      try {
        node.stop();
      } catch {
        // Ignore already-stopped nodes
      }
    }
    activeOutputNodesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const flushUserTranscript = useCallback(() => {
    const text = userBufferRef.current.trim();
    if (text) {
      onTranscriptTurnRef.current('user', text);
      userBufferRef.current = '';
      setLiveUserTranscript('');
    }
  }, []);

  const flushModelTranscript = useCallback(() => {
    const text = modelBufferRef.current.trim();
    if (text) {
      onTranscriptTurnRef.current('assistant', text);
      modelBufferRef.current = '';
      setLiveModelTranscript('');
    }
  }, []);

  const cleanupResources = useCallback(() => {
    isReadyRef.current = false;
    isConnectingRef.current = false;
    stopOutputPlayback();

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try {
        processorRef.current.disconnect();
      } catch {
        // Ignore
      }
      processorRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignore
      }
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      void inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (outputAudioCtxRef.current) {
      void outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (
        wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING
      ) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    setAudioLevel(0);
  }, [stopOutputPlayback]);

  const stopVoice = useCallback(() => {
    flushUserTranscript();
    flushModelTranscript();
    cleanupResources();
    setStatus('idle');
    setIsMuted(false);
    isMutedRef.current = false;
    setError(null);
  }, [cleanupResources, flushModelTranscript, flushUserTranscript]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (next) setAudioLevel(0);
      return next;
    });
  }, []);

  const startVoice = useCallback(
    async (selectedSport: string, recentMessages: ChatMessage[]) => {
      cleanupResources();
      userBufferRef.current = '';
      modelBufferRef.current = '';
      setLiveUserTranscript('');
      setLiveModelTranscript('');
      setError(null);
      setIsMuted(false);
      isMutedRef.current = false;
      isConnectingRef.current = true;
      setStatus('connecting');

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Microphone access is not supported in this browser.');
        setStatus('error');
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: INPUT_SAMPLE_RATE,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        setError(
          'Microphone permission was denied. Allow microphone access to start a voice conversation.'
        );
        setStatus('error');
        return;
      }

      mediaStreamRef.current = stream;

      try {
        const inputCtx = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
        const outputCtx = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
        await inputCtx.resume();
        await outputCtx.resume();
        inputAudioCtxRef.current = inputCtx;
        outputAudioCtxRef.current = outputCtx;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/api/live-voice`);
        wsRef.current = ws;

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        // Route through a silent gain node so onaudioprocess fires without mic echo
        const silentGain = inputCtx.createGain();
        silentGain.gain.value = 0;

        source.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(inputCtx.destination);
        sourceNodeRef.current = source;
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (!isReadyRef.current || isMutedRef.current) return;
          if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

          const inputData = event.inputBuffer.getChannelData(0);
          const { base64, rms } = encodeFloat32To16kPcmBase64(
            inputData,
            inputCtx.sampleRate
          );

          if (activeOutputNodesRef.current.size === 0) {
            setAudioLevel(Math.min(1, rms * 5));
          }

          wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
        };

        ws.onopen = () => {
          const recentTurns = recentMessages
            .filter((m) => !m.error && m.content.trim().length > 0)
            .slice(-4)
            .map((m) => ({ role: m.role, content: m.content }));

          ws.send(
            JSON.stringify({
              type: 'start',
              sport: selectedSport,
              recentTurns,
            })
          );
        };

        ws.onmessage = (event) => {
          let payload: {
            type: string;
            data?: string;
            text?: string;
            message?: string;
          };
          try {
            payload = JSON.parse(event.data as string);
          } catch {
            return;
          }

          if (payload.type === 'ready') {
            isConnectingRef.current = false;
            isReadyRef.current = true;
            setStatus('listening');
            return;
          }

          if (payload.type === 'input_transcript' && payload.text) {
            userBufferRef.current += payload.text;
            setLiveUserTranscript(userBufferRef.current);
            return;
          }

          if (payload.type === 'output_transcript' && payload.text) {
            flushUserTranscript();
            modelBufferRef.current += payload.text;
            setLiveModelTranscript(modelBufferRef.current);
            setStatus('speaking');
            return;
          }

          if (payload.type === 'audio' && payload.data && outputAudioCtxRef.current) {
            flushUserTranscript();
            setStatus('speaking');
            const outCtx = outputAudioCtxRef.current;
            if (outCtx.state === 'suspended') {
              void outCtx.resume();
            }

            const { float32, rms } = decodePcm16Base64ToFloat32(payload.data);
            setAudioLevel(Math.min(1, rms * 4.5));

            const buffer = outCtx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
            buffer.getChannelData(0).set(float32);

            const bufferSource = outCtx.createBufferSource();
            bufferSource.buffer = buffer;
            bufferSource.connect(outCtx.destination);

            const startAt = Math.max(outCtx.currentTime, nextStartTimeRef.current);
            bufferSource.start(startAt);
            nextStartTimeRef.current = startAt + buffer.duration;

            activeOutputNodesRef.current.add(bufferSource);
            bufferSource.onended = () => {
              activeOutputNodesRef.current.delete(bufferSource);
              if (activeOutputNodesRef.current.size === 0 && isReadyRef.current) {
                setStatus('listening');
                setAudioLevel(0);
              }
            };
            return;
          }

          if (payload.type === 'interrupted') {
            stopOutputPlayback();
            flushModelTranscript();
            if (isReadyRef.current) {
              setStatus('listening');
            }
            return;
          }

          if (payload.type === 'turn_complete') {
            flushUserTranscript();
            flushModelTranscript();
            if (activeOutputNodesRef.current.size === 0 && isReadyRef.current) {
              setStatus('listening');
              setAudioLevel(0);
            }
            return;
          }

          if (payload.type === 'error') {
            flushUserTranscript();
            flushModelTranscript();
            setError(payload.message || 'Voice connection error.');
            setStatus('error');
            cleanupResources();
          }
        };

        ws.onerror = () => {
          if (isReadyRef.current || isConnectingRef.current) {
            setError('Lost connection to the live voice server. Please try again.');
            setStatus('error');
          }
          cleanupResources();
        };

        ws.onclose = () => {
          flushUserTranscript();
          flushModelTranscript();
          if (isReadyRef.current) {
            cleanupResources();
            setStatus('idle');
          } else if (isConnectingRef.current) {
            setError('Voice connection closed unexpectedly. Please try again.');
            setStatus('error');
            cleanupResources();
          }
        };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to start voice conversation.';
        setError(msg);
        setStatus('error');
        cleanupResources();
      }
    },
    [
      cleanupResources,
      flushModelTranscript,
      flushUserTranscript,
      stopOutputPlayback,
    ]
  );

  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    status,
    isMuted,
    error,
    liveUserTranscript,
    liveModelTranscript,
    audioLevel,
    startVoice,
    stopVoice,
    toggleMute,
  };
}
