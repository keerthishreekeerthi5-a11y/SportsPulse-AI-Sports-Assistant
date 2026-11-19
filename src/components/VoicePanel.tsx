import { AlertTriangle, Mic, MicOff, PhoneOff } from 'lucide-react';
import type { VoiceStatus } from '../hooks/useVoiceChat';

interface VoicePanelProps {
  status: VoiceStatus;
  isMuted: boolean;
  error: string | null;
  liveUserTranscript: string;
  liveModelTranscript: string;
  audioLevel: number;
  onToggleMute: () => void;
  onEndVoice: () => void;
  onRetryVoice: () => void;
}

export function VoicePanel({
  status,
  isMuted,
  error,
  liveUserTranscript,
  liveModelTranscript,
  audioLevel,
  onToggleMute,
  onEndVoice,
  onRetryVoice,
}: VoicePanelProps) {
  if (status === 'idle') return null;

  const statusText =
    status === 'connecting'
      ? 'Connecting live voice...'
      : status === 'error'
        ? 'Voice unavailable'
        : isMuted
          ? 'Microphone muted'
          : status === 'speaking'
            ? 'SportsPulse speaking'
            : 'Listening — ask any sports question';

  const barMultipliers = [0.4, 0.75, 1, 0.85, 0.55, 0.35];

  return (
    <div className="shrink-0 border-t border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/85 dark:bg-emerald-950/35 backdrop-blur-md px-3 sm:px-6 py-3">
      <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Status + real-time audio bars */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex items-center justify-center gap-1 h-7 w-10 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/70 dark:border-emerald-800/60 shrink-0 px-1.5"
              aria-hidden="true"
            >
              {barMultipliers.map((mult, idx) => {
                const level =
                  status === 'connecting'
                    ? 0.25
                    : status === 'error' || isMuted
                      ? 0.1
                      : Math.min(1, audioLevel * mult);
                const heightClass =
                  level > 0.75
                    ? 'h-5'
                    : level > 0.5
                      ? 'h-4'
                      : level > 0.3
                        ? 'h-3'
                        : level > 0.15
                          ? 'h-2'
                          : 'h-1.5';
                return (
                  <span
                    key={idx}
                    className={`w-0.5 rounded-full transition-all duration-75 ${heightClass} ${
                      status === 'error'
                        ? 'bg-red-500 dark:bg-red-400'
                        : 'bg-emerald-600 dark:bg-emerald-400'
                    }`}
                  />
                );
              })}
            </div>

            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-slate-950 dark:text-white truncate">
                {statusText}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                Live Broadcast Voice · Sports Desk
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {status === 'error' ? (
              <button
                type="button"
                onClick={onRetryVoice}
                className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Try again
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                className={`min-h-[40px] min-w-[40px] px-3 py-1.5 inline-flex items-center gap-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isMuted
                    ? 'border-amber-300 dark:border-amber-800 bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onEndVoice}
              aria-label="End voice conversation"
              className="min-h-[40px] px-3.5 py-1.5 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End</span>
            </button>
          </div>
        </div>

        {/* Friendly voice error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-900 dark:text-red-200"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Live in-progress transcript preview */}
        {(liveUserTranscript || liveModelTranscript) && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            {liveUserTranscript && (
              <p>
                <span className="font-semibold text-slate-950 dark:text-white">You: </span>
                {liveUserTranscript}
              </p>
            )}
            {liveModelTranscript && (
              <p>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  SportsPulse:{' '}
                </span>
                {liveModelTranscript}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
