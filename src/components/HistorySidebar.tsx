import { useState } from 'react';
import { MessageSquare, Search, Trash2, X } from 'lucide-react';
import type { ChatSession } from '../types/chat';

interface HistorySidebarProps {
  isOpen: boolean;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAllHistory: () => void;
}

function formatSessionTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function HistorySidebar({
  isOpen,
  sessions,
  activeSessionId,
  onClose,
  onSelectSession,
  onDeleteSession,
  onClearAllHistory,
}: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  if (!isOpen) return null;

  const trimmedQuery = searchQuery.trim().toLowerCase();
  const filteredSessions = trimmedQuery
    ? sessions.filter(
        (s) =>
          s.title.toLowerCase().includes(trimmedQuery) ||
          s.sportContext.toLowerCase().includes(trimmedQuery) ||
          s.messages.some((m) => m.content.toLowerCase().includes(trimmedQuery))
      )
    : sessions;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        aria-label="Chat history"
        className="fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] lg:static lg:z-auto lg:w-72 lg:shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0B111C]"
      >
        {/* Sidebar header */}
        <div className="h-14 shrink-0 px-4 border-b border-slate-200 dark:border-slate-800/90 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="font-display text-lg font-bold tracking-tight text-slate-950 dark:text-white truncate">
              Chat history
            </h2>
            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {sessions.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close history sidebar"
            className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search box */}
        {sessions.length > 0 && (
          <div className="p-3 border-b border-slate-200/80 dark:border-slate-800/80">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                aria-label="Search chat history"
                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              />
            </div>
          </div>
        )}

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
          {sessions.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                No saved conversations
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Your text, media, and voice chats appear here automatically.
              </p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No conversations match &ldquo;{searchQuery}&rdquo;.
            </p>
          ) : (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const msgCount = session.messages.length;
              return (
                <div
                  key={session.id}
                  className={`group flex items-center gap-1 rounded-xl border transition-colors duration-150 ${
                    isActive
                      ? 'border-emerald-600/40 bg-emerald-50/90 dark:bg-emerald-950/40'
                      : 'border-transparent hover:bg-slate-100/90 dark:hover:bg-slate-900/90'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    className="flex-1 min-w-0 text-left px-3 py-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-xl"
                  >
                    <p
                      className={`text-xs sm:text-[13px] font-medium truncate ${
                        isActive
                          ? 'text-emerald-950 dark:text-emerald-200'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {session.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 tabular-nums">
                      {session.sportContext !== 'All' ? `${session.sportContext} · ` : ''}
                      {msgCount} {msgCount === 1 ? 'msg' : 'msgs'} ·{' '}
                      {formatSessionTime(session.updatedAt)}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    aria-label={`Delete conversation ${session.title}`}
                    title="Delete conversation"
                    className="shrink-0 mr-1.5 min-h-[34px] min-w-[34px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Clear all history */}
        {sessions.length > 0 && (
          <div className="shrink-0 p-3 border-t border-slate-200 dark:border-slate-800/90">
            {confirmClearAll ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllHistory();
                    setConfirmClearAll(false);
                    setSearchQuery('');
                  }}
                  className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Confirm clear all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="w-full min-h-[38px] px-3 py-2 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/60 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear all history</span>
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
