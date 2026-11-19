import { History, Moon, Plus, Sun, Trash2 } from 'lucide-react';

interface ChatHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  hasMessages: boolean;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  historyCount: number;
}

export function ChatHeader({
  isDark,
  onToggleTheme,
  onNewChat,
  onClearChat,
  hasMessages,
  isHistoryOpen,
  onToggleHistory,
  historyCount,
}: ChatHeaderProps) {
  return (
    <header className="shrink-0 h-14 border-b border-slate-200/90 dark:border-slate-800/90 bg-white/90 dark:bg-[#0B111C]/90 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-4 sm:gap-8 z-20">
      {/* Zone 1: History Toggle + SportsPulse Brand Wordmark */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onToggleHistory}
          aria-label={isHistoryOpen ? 'Close chat history' : 'Open chat history'}
          aria-expanded={isHistoryOpen}
          title={`Chat history (${historyCount})`}
          className={`min-h-[40px] px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 whitespace-nowrap shrink-0 cursor-pointer ${
            isHistoryOpen
              ? 'border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">History</span>
        </button>

        <button
          type="button"
          onClick={onNewChat}
          className="group flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg py-1 whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="SportsPulse home"
        >
          <span className="w-8 h-8 rounded-lg bg-slate-950 dark:bg-emerald-600 text-emerald-400 dark:text-white flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-[1.03]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3.5 13H7.5L10 6.5L14 17.5L16.5 11H20.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white leading-none">
            SportsPulse
          </span>
        </button>
      </div>

      {/* Zone 2: Minimal Single-Line Broadcast Context */}
      <div className="hidden md:flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        <span>Global Sports Desk</span>
        <span aria-hidden="true">·</span>
        <span>Live Search, Media &amp; Voice</span>
      </div>

      {/* Zone 3: Theme Toggle, Clear Chat & New Chat */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {hasMessages && (
          <button
            type="button"
            onClick={onClearChat}
            aria-label="Clear current chat"
            title="Clear current chat"
            className="min-h-[40px] px-2.5 sm:px-3 py-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/60 hover:bg-red-50/60 dark:hover:bg-red-950/30 text-xs sm:text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Clear chat</span>
          </button>
        )}

        <button
          type="button"
          onClick={onNewChat}
          className="min-h-[40px] px-3.5 sm:px-4 py-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-950 dark:bg-emerald-600 text-white text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 whitespace-nowrap shrink-0 cursor-pointer"
          aria-label="Start a new chat"
          title={hasMessages ? 'Save current chat and start a new one' : 'Start a new chat'}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>New chat</span>
        </button>
      </div>
    </header>
  );
}
