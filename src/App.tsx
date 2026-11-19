import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ComposerBar } from './components/ComposerBar';
import type { ComposerActionsHandle } from './components/ComposerBar';
import { EmptyState } from './components/EmptyState';
import { HistorySidebar } from './components/HistorySidebar';
import { MessageBubble } from './components/MessageBubble';
import { VoicePanel } from './components/VoicePanel';
import { useVoiceChat } from './hooks/useVoiceChat';
import { SportsApiError, streamSportsChat } from './services/sportsApi';
import type { ChatAttachment, ChatMessage, ChatSession, SourceLink } from './types/chat';

const SESSIONS_STORAGE_KEY = 'sportspulse_sessions_v1';
const ACTIVE_SESSION_STORAGE_KEY = 'sportspulse_active_session_v1';
const MAX_SAVED_SESSIONS = 50;

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildSessionTitle(msgs: ChatMessage[]): string {
  const firstUser = msgs.find(
    (m) => m.role === 'user' && (m.content.trim().length > 0 || (m.attachments?.length ?? 0) > 0)
  );
  const raw =
    firstUser?.content.trim() ||
    firstUser?.attachments?.[0]?.name ||
    msgs[0]?.content.trim() ||
    'Sports conversation';
  return raw.length > 52 ? `${raw.slice(0, 52).trim()}...` : raw;
}

function loadStoredSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is ChatSession =>
          Boolean(s) &&
          typeof s.id === 'string' &&
          typeof s.title === 'string' &&
          Array.isArray(s.messages)
      )
      .map((s) => ({
        ...s,
        sportContext: typeof s.sportContext === 'string' ? s.sportContext : 'All',
        updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
        messages: s.messages.map((m) => ({ ...m, isStreaming: false })),
      }));
  } catch {
    return [];
  }
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('sportspulse_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadStoredSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const storedId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    const initialSessions = loadStoredSessions();
    if (storedId && initialSessions.some((s) => s.id === storedId)) {
      return storedId;
    }
    return null;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    const storedId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    const initialSessions = loadStoredSessions();
    const matched = storedId ? initialSessions.find((s) => s.id === storedId) : undefined;
    return matched ? matched.messages : [];
  });

  const [selectedSport, setSelectedSport] = useState<string>(() => {
    if (typeof window === 'undefined') return 'All';
    const storedId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    const initialSessions = loadStoredSessions();
    const matched = storedId ? initialSessions.find((s) => s.id === storedId) : undefined;
    return matched?.sportContext || 'All';
  });

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1024 && loadStoredSessions().length > 0;
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerActionsRef = useRef<ComposerActionsHandle | null>(null);

  // Sync Tailwind dark class on <html> and persist preference
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('sportspulse_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Persist active session ID
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    }
  }, [activeSessionId]);

  // Persist sessions list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore quota exceeded errors gracefully
    }
  }, [sessions]);

  // Automatically sync non-empty active messages into the active history session
  useEffect(() => {
    if (messages.length === 0) return;

    const currentId = activeSessionId ?? createId();
    if (!activeSessionId) {
      setActiveSessionId(currentId);
    }

    const sanitizedMessages = messages.map((m) => ({
      ...m,
      isStreaming: false,
      // Omit large inline base64 payloads & blob URLs from localStorage to avoid quota overflow
      attachments: m.attachments?.map((att) => ({
        id: att.id,
        kind: att.kind,
        name: att.name,
        mimeType: att.mimeType,
        url: att.url,
        sizeBytes: att.sizeBytes,
        previewUrl:
          att.kind === 'link'
            ? att.url
            : att.kind === 'image' && att.previewUrl && att.previewUrl.length < 60000
              ? att.previewUrl
              : undefined,
      })),
    }));

    setSessions((prev) => {
      const existing = prev.find((s) => s.id === currentId);
      const updatedSession: ChatSession = {
        id: currentId,
        title: buildSessionTitle(sanitizedMessages),
        sportContext: selectedSport,
        messages: sanitizedMessages,
        updatedAt:
          existing &&
          existing.messages.length === sanitizedMessages.length &&
          existing.messages[existing.messages.length - 1]?.content ===
            sanitizedMessages[sanitizedMessages.length - 1]?.content
            ? existing.updatedAt
            : Date.now(),
      };

      const others = prev.filter((s) => s.id !== currentId);
      return [updatedSession, ...others].slice(0, MAX_SAVED_SESSIONS);
    });
  }, [messages, activeSessionId, selectedSport]);

  // Keep viewport anchored to the latest streamed output
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
  }, [messages, isStreaming]);

  const selectedSportRef = useRef(selectedSport);
  useEffect(() => {
    selectedSportRef.current = selectedSport;
  }, [selectedSport]);

  const handleVoiceTranscriptTurn = useCallback((role: 'user' | 'assistant', text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createId(),
        role,
        content: text,
        sportContext: role === 'user' ? selectedSportRef.current : undefined,
        modelUsed: role === 'assistant' ? 'gemini-3.8-live' : undefined,
        isVoice: true,
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const voice = useVoiceChat({ onTranscriptTurn: handleVoiceTranscriptTurn });
  const isVoiceActive = voice.status !== 'idle';

  const stopActiveStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg))
    );
  };

  // Start a fresh conversation while keeping previous sessions in History
  const handleNewChat = () => {
    stopActiveStream();
    if (isVoiceActive) {
      voice.stopVoice();
    }
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setAttachments([]);
  };

  // Clear the current conversation and remove it from saved history
  const handleClearChat = () => {
    stopActiveStream();
    if (isVoiceActive) {
      voice.stopVoice();
    }
    const idToRemove = activeSessionId;
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setAttachments([]);
    if (idToRemove) {
      setSessions((prev) => prev.filter((s) => s.id !== idToRemove));
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) return;
    stopActiveStream();
    if (isVoiceActive) {
      voice.stopVoice();
    }
    setActiveSessionId(target.id);
    setMessages(target.messages);
    setSelectedSport(target.sportContext || 'All');
    setInput('');
    setAttachments([]);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsHistoryOpen(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (sessionId === activeSessionId) {
      stopActiveStream();
      if (isVoiceActive) {
        voice.stopVoice();
      }
      setActiveSessionId(null);
      setMessages([]);
      setInput('');
      setAttachments([]);
    }
  };

  const handleClearAllHistory = () => {
    stopActiveStream();
    if (isVoiceActive) {
      voice.stopVoice();
    }
    setSessions([]);
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
    setAttachments([]);
  };

  const handleToggleVoice = () => {
    if (isVoiceActive) {
      voice.stopVoice();
    } else {
      void voice.startVoice(selectedSport, messages);
    }
  };

  const runChatTurn = async (
    historyForRequest: ChatMessage[],
    assistantMessageId: string,
    sportForRequest: string
  ) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    try {
      await streamSportsChat(
        historyForRequest.map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        })),
        sportForRequest,
        {
          onMeta: ({ model, isFallback }) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, modelUsed: model, isFallback }
                  : msg
              )
            );
          },
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + token }
                  : msg
              )
            );
          },
          onSources: (incomingSources: SourceLink[]) => {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantMessageId) return msg;
                const existing = msg.sources ?? [];
                const seen = new Set(existing.map((s) => s.url));
                const merged = [...existing];
                for (const s of incomingSources) {
                  if (!seen.has(s.url)) {
                    seen.add(s.url);
                    merged.push(s);
                  }
                }
                return { ...msg, sources: merged };
              })
            );
          },
          onDone: () => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
              )
            );
          },
        },
        controller.signal
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
          )
        );
        return;
      }

      const errorInfo =
        error instanceof SportsApiError
          ? error.info
          : {
              code: 'NETWORK_ERROR' as const,
              message: 'Something went wrong while fetching the answer. Please try again.',
            };

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, isStreaming: false, error: errorInfo }
            : msg
        )
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
    }
  };

  const sendPrompt = async (rawPrompt: string, customAttachments?: ChatAttachment[]) => {
    const trimmed = rawPrompt.trim();
    const attached = customAttachments ?? attachments;
    if ((!trimmed && attached.length === 0) || isStreaming) return;

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: trimmed,
      sportContext: selectedSport,
      attachments: attached.length > 0 ? attached : undefined,
      createdAt: Date.now(),
    };

    const assistantMessageId = createId();
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      sources: [],
      createdAt: Date.now(),
    };

    const priorValidHistory = messages.filter(
      (m) => !m.error && (m.content.trim().length > 0 || (m.attachments?.length ?? 0) > 0)
    );
    const nextHistoryForApi = [...priorValidHistory, userMessage];

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput('');
    if (!customAttachments) {
      setAttachments([]);
    }

    await runChatTurn(nextHistoryForApi, assistantMessageId, selectedSport);
  };

  const handleRetry = async (failedAssistantIndex: number) => {
    if (isStreaming) return;

    const historySlice = messages.slice(0, failedAssistantIndex);
    const lastUserMessage = [...historySlice].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage) return;

    const retryAssistantId = createId();
    const retryPlaceholder: ChatMessage = {
      id: retryAssistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      sources: [],
      createdAt: Date.now(),
    };

    const validHistory = historySlice.filter(
      (m) => !m.error && (m.content.trim().length > 0 || (m.attachments?.length ?? 0) > 0)
    );
    setMessages([...historySlice, retryPlaceholder]);

    await runChatTurn(
      validHistory,
      retryAssistantId,
      lastUserMessage.sportContext ?? selectedSport
    );
  };

  return (
    <div className="h-dvh flex bg-slate-50 dark:bg-[#070B12] text-slate-900 dark:text-slate-100 overflow-hidden">
      <HistorySidebar
        isOpen={isHistoryOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onClearAllHistory={handleClearAllHistory}
      />

      <div className="flex-1 min-w-0 flex flex-col stadium-canvas">
        <ChatHeader
          isDark={isDark}
          onToggleTheme={() => setIsDark((prev) => !prev)}
          onNewChat={handleNewChat}
          onClearChat={handleClearChat}
          hasMessages={messages.length > 0}
          isHistoryOpen={isHistoryOpen}
          onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
          historyCount={sessions.length}
        />

        {/* Scrollable conversation area */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6">
          <div
            className={`max-w-6xl mx-auto min-h-full flex flex-col py-4 sm:py-5 ${
              messages.length === 0 ? 'justify-start lg:justify-center' : ''
            }`}
          >
            {messages.length === 0 ? (
              <EmptyState
                selectedSport={selectedSport}
                isVoiceActive={isVoiceActive}
                onSelectSport={setSelectedSport}
                onSelectQuickAction={(prompt) => void sendPrompt(prompt)}
                onTriggerImageUpload={() => composerActionsRef.current?.openImagePicker()}
                onTriggerVideoUpload={() => composerActionsRef.current?.openVideoPicker()}
                onTriggerLinkInput={() => composerActionsRef.current?.openLinkInput()}
                onToggleVoice={handleToggleVoice}
              />
            ) : (
              <div className="max-w-4xl w-full mx-auto flex flex-col gap-4 pb-2">
                {messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onRetry={
                      message.error ? () => void handleRetry(index) : undefined
                    }
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </main>

        <VoicePanel
          status={voice.status}
          isMuted={voice.isMuted}
          error={voice.error}
          liveUserTranscript={voice.liveUserTranscript}
          liveModelTranscript={voice.liveModelTranscript}
          audioLevel={voice.audioLevel}
          onToggleMute={voice.toggleMute}
          onEndVoice={voice.stopVoice}
          onRetryVoice={() => void voice.startVoice(selectedSport, messages)}
        />

        <ComposerBar
          input={input}
          onInputChange={setInput}
          attachments={attachments}
          onAddAttachments={(items) => setAttachments((prev) => [...prev, ...items])}
          onRemoveAttachment={(id) =>
            setAttachments((prev) => prev.filter((item) => item.id !== id))
          }
          selectedSport={selectedSport}
          onSelectSport={setSelectedSport}
          isStreaming={isStreaming}
          isVoiceActive={isVoiceActive}
          onToggleVoice={handleToggleVoice}
          onSubmit={() => void sendPrompt(input)}
          onStop={stopActiveStream}
          showInlineQuickChips={messages.length > 0}
          onSelectQuickAction={(prompt) => void sendPrompt(prompt, [])}
          actionsRef={composerActionsRef}
        />
      </div>
    </div>
  );
}
