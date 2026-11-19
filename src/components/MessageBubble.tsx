import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Film,
  Info,
  Link2,
  RotateCcw,
} from 'lucide-react';
import type { ChatMessage } from '../types/chat';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: () => void;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [showAllSources, setShowAllSources] = useState(false);

  const handleCopy = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API may be restricted in some contexts
    }
  };

  if (message.role === 'user') {
    const metaParts: string[] = [];
    if (message.isVoice) metaParts.push('Voice');
    if (message.sportContext && message.sportContext !== 'All') {
      metaParts.push(`Sport filter · ${message.sportContext}`);
    }
    const attachments = message.attachments ?? [];

    return (
      <div className="flex flex-col items-end gap-1.5 animate-message-enter">
        {metaParts.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400 pr-1">
            {metaParts.join(' · ')}
          </span>
        )}
        <div className="max-w-[88%] sm:max-w-[74%] rounded-2xl rounded-br-sm bg-slate-950 dark:bg-emerald-700 text-white px-4 py-3 text-[15px] leading-relaxed space-y-2.5">
          {attachments.length > 0 && (
            <div className="flex flex-col gap-2">
              {attachments.map((att) => {
                if (att.kind === 'image') {
                  const src = att.previewUrl || (att.data ? att.data : undefined);
                  return src ? (
                    <img
                      key={att.id}
                      src={src}
                      alt={att.name}
                      referrerPolicy="no-referrer"
                      className="max-h-60 w-auto rounded-xl object-contain bg-black/25 border border-white/15"
                    />
                  ) : (
                    <div
                      key={att.id}
                      className="text-xs text-white/85 bg-white/10 rounded-lg px-2.5 py-1.5"
                    >
                      Image: {att.name}
                    </div>
                  );
                }

                if (att.kind === 'video') {
                  return att.previewUrl ? (
                    <video
                      key={att.id}
                      src={att.previewUrl}
                      controls
                      preload="metadata"
                      className="max-h-60 w-full rounded-xl bg-black border border-white/15"
                    />
                  ) : (
                    <div
                      key={att.id}
                      className="inline-flex items-center gap-2 text-xs text-white/90 bg-white/10 rounded-lg px-2.5 py-1.5"
                    >
                      <Film className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{att.name}</span>
                    </div>
                  );
                }

                return (
                  <a
                    key={att.id}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-white/95 bg-white/10 hover:bg-white/20 rounded-lg px-2.5 py-1.5 transition-colors max-w-full"
                  >
                    <Link2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate underline underline-offset-2">{att.url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 opacity-80" />
                  </a>
                );
              })}
            </div>
          )}

          {message.content && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
      </div>
    );
  }

  const isWaitingFirstToken = Boolean(message.isStreaming && !message.content && !message.error);
  const sources = message.sources ?? [];

  return (
    <div className="flex flex-col items-start w-full animate-message-enter">
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1420] px-4 py-4 sm:px-6 sm:py-5">
        {/* Editorial unboxed metadata header */}
        <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 min-w-0">
            <span className="w-6 h-6 rounded-md bg-emerald-600/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3.5 13H7.5L10 6.5L14 17.5L16.5 11H20.5"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              SportsPulse
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate">
              {message.isVoice
                ? 'Voice conversation'
                : message.modelUsed === 'gemini-4-hydrogen' ||
                    message.modelUsed === 'gemini-3.1-flash-lite'
                  ? 'Media & web analysis'
                  : message.isFallback
                    ? 'Offline model (no web search)'
                    : message.modelUsed
                      ? 'Live web search'
                      : 'Sports Desk'}
            </span>
          </div>

          {!message.isStreaming && message.content && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? 'Copied response' : 'Copy response'}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Fallback mode notice */}
        {message.isFallback && (
          <div
            role="status"
            className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/80 dark:bg-amber-950/40 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200"
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
            <span>
              Using fallback model (
              <span className="font-mono">{message.modelUsed || 'fallback model'}</span>)
              without live web search — recent scores, standings, and news may be out of date.
            </span>
          </div>
        )}

        {/* Typing Indicator */}
        {isWaitingFirstToken && (
          <div
            className="flex items-center gap-3 py-2 text-sm text-slate-500 dark:text-slate-400"
            aria-label="SportsPulse is typing"
          >
            <div className="flex items-end gap-1 h-4" aria-hidden="true">
              <span className="typing-bar w-1 h-4 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
              <span className="typing-bar w-1 h-4 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
              <span className="typing-bar w-1 h-4 rounded-full bg-emerald-600 dark:bg-emerald-400 inline-block" />
            </div>
            <span>
              {sources.length > 0
                ? `Found ${sources.length} sources, writing answer...`
                : 'Checking live sports updates...'}
            </span>
          </div>
        )}

        {/* Streamed or completed markdown content */}
        {message.content && <MarkdownContent content={message.content} />}

        {/* Error state with explicit text + icon + retry */}
        {message.error && (
          <div
            role="alert"
            className="mt-2 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50/80 dark:bg-red-950/40 p-4 text-sm text-red-900 dark:text-red-200"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-red-950 dark:text-red-100">
                  {message.error.code === 'INVALID_API_KEY'
                    ? 'API Key Error (401)'
                    : message.error.code === 'RATE_LIMIT'
                      ? 'Rate Limit Reached (429)'
                      : message.error.code === 'NETWORK_ERROR'
                        ? 'Network Connection Failed'
                        : 'Unable to Complete Request'}
                </p>
                <p className="text-red-800 dark:text-red-200/90 leading-relaxed">
                  {message.error.message}
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500 text-white px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry question</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Source Links under the answer */}
        {sources.length > 0 && !isWaitingFirstToken && (
          <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Sources ({sources.length})
              </p>
              {sources.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllSources((prev) => !prev)}
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {showAllSources ? 'Show fewer' : `Show all ${sources.length}`}
                </button>
              )}
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(showAllSources ? sources : sources.slice(0, 6)).map((src) => (
                <li key={src.url}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-3 py-2.5 text-xs hover:border-emerald-500/60 dark:hover:border-emerald-500/60 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                        {src.title}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {getHostname(src.url)}
                      </p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mt-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
