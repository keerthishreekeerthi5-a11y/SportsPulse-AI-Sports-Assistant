import { useState } from 'react';
import { ArrowUpRight, AudioLines, ImagePlus, Link2, Video } from 'lucide-react';
import { QUICK_ACTIONS } from '../types/chat';

interface FeaturedSport {
  value: string;
  label: string;
}

// Values match SPORT_OPTIONS in src/types/chat.ts so the focus switcher and dropdown stay in sync.
const FEATURED_SPORTS: FeaturedSport[] = [
  { value: 'All', label: 'All Sports' },
  { value: 'Cricket', label: 'Cricket' },
  { value: 'Football (Soccer)', label: 'Football' },
  { value: 'Tennis', label: 'Tennis' },
  { value: 'Basketball', label: 'Basketball' },
  { value: 'Formula 1', label: 'Formula 1' },
  { value: 'Badminton', label: 'Badminton' },
];

const QUICK_PLAY_SUBTITLES: Record<string, string> = {
  'Live scores today': 'Live match updates',
  'Cricket news': 'International & leagues',
  'Football standings': 'Top league tables',
  'Tennis rankings': 'ATP & WTA singles',
  'Upcoming matches': "This week's fixtures",
  'Explain a rule': 'Rules & examples',
};

const STADIUM_IMAGE_SRC = '/src/assets/images/sports_arena_editorial_1794997133703.jpg';

interface EmptyStateProps {
  selectedSport: string;
  isVoiceActive: boolean;
  onSelectSport: (sport: string) => void;
  onSelectQuickAction: (prompt: string) => void;
  onTriggerImageUpload: () => void;
  onTriggerVideoUpload: () => void;
  onTriggerLinkInput: () => void;
  onToggleVoice: () => void;
}

export function EmptyState({
  selectedSport,
  isVoiceActive,
  onSelectSport,
  onSelectQuickAction,
  onTriggerImageUpload,
  onTriggerVideoUpload,
  onTriggerLinkInput,
  onToggleVoice,
}: EmptyStateProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const activeSportLabel =
    selectedSport === 'Football (Soccer)' ? 'Football' : selectedSport;

  return (
    <div className="w-full py-2 sm:py-4 px-1 sm:px-2">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-stretch">
        {/* Left Column: Editorial Headline, Sport Focus & Quick-Play Grid */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
            Global Sports Desk · Live Search, Media &amp; Voice
          </p>

          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-slate-950 dark:text-white leading-[1.03] text-balance mb-3">
            Scores, standings, and rules across every sport on earth.
          </h1>

          <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed mb-5">
            Ask about live matches, league tables, player form, or official rules—from Test
            cricket and Premier League football to Formula 1, kabaddi, badminton, and esports.
          </p>

          {/* Interactive Sport Focus Switcher */}
          <div className="mb-5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Focus sport context
            </p>
            <div
              role="group"
              aria-label="Select sport context"
              className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
            >
              {FEATURED_SPORTS.map((sport) => {
                const active = selectedSport === sport.value;
                return (
                  <button
                    key={sport.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelectSport(sport.value)}
                    className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      active
                        ? 'bg-slate-950 dark:bg-emerald-600 text-white'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-600/50 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    {sport.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick-Action Playbook Cards */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Quick plays{selectedSport !== 'All' ? ` · ${activeSportLabel}` : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {QUICK_ACTIONS.map((action) => {
                const subtitle =
                  selectedSport !== 'All' &&
                  (action.label === 'Live scores today' ||
                    action.label === 'Upcoming matches' ||
                    action.label === 'Explain a rule')
                    ? `${activeSportLabel} focus`
                    : QUICK_PLAY_SUBTITLES[action.label] ?? 'Worldwide update';

                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => onSelectQuickAction(action.buildPrompt(selectedSport))}
                    className="group min-h-[56px] flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1420] px-3.5 py-2.5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-emerald-600/60 dark:hover:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <span className="block text-[13px] sm:text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {action.label}
                      </span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {subtitle}
                      </span>
                    </div>
                    <ArrowUpRight className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Stadium Showcase + Multimodal & Live Voice Triggers */}
        <div className="lg:col-span-5 flex">
          <div className="relative w-full min-h-[300px] sm:min-h-[340px] lg:min-h-[390px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900">
            {/* Fallback architectural gradient + pitch mark if image asset fails */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 flex items-center justify-center"
              aria-hidden="true"
            >
              <svg
                width="96"
                height="96"
                viewBox="0 0 24 24"
                fill="none"
                className="text-emerald-500/20"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.2" />
                <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </div>

            {!imageFailed && (
              <img
                src={STADIUM_IMAGE_SRC}
                alt="Floodlit championship stadium pitch and athletics track at twilight"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Measured contrast scrim */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-950/15"
              aria-hidden="true"
            />

            {/* Bottom interactive modality triggers */}
            <div className="relative h-full flex flex-col justify-end p-5 sm:p-6 text-white">
              <p className="text-xs font-semibold text-emerald-300 mb-1">
                Visual, Link &amp; Voice Analysis
              </p>
              <h2 className="font-display text-2xl sm:text-[30px] font-bold tracking-tight leading-[1.08] text-balance mb-4">
                Ask from a match photo, video clip, link, or live voice.
              </h2>

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onTriggerImageUpload}
                    className="min-h-[42px] flex items-center justify-between gap-1.5 rounded-xl bg-white/12 hover:bg-white/20 backdrop-blur-sm border border-white/15 px-3 py-2 text-xs sm:text-[13px] font-medium text-white transition-colors duration-150 cursor-pointer whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <ImagePlus className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="truncate">Upload photo</span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-white/70" />
                  </button>

                  <button
                    type="button"
                    onClick={onTriggerVideoUpload}
                    className="min-h-[42px] flex items-center justify-between gap-1.5 rounded-xl bg-white/12 hover:bg-white/20 backdrop-blur-sm border border-white/15 px-3 py-2 text-xs sm:text-[13px] font-medium text-white transition-colors duration-150 cursor-pointer whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-1.5 truncate">
                      <Video className="w-4 h-4 text-emerald-300 shrink-0" />
                      <span className="truncate">Upload video</span>
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-white/70" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onTriggerLinkInput}
                  className="min-h-[42px] w-full flex items-center justify-between gap-2 rounded-xl bg-white/12 hover:bg-white/20 backdrop-blur-sm border border-white/15 px-3.5 py-2 text-xs sm:text-[13px] font-medium text-white transition-colors duration-150 cursor-pointer whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <Link2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="truncate">Inspect scorecard or article link</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-white/70" />
                </button>

                <button
                  type="button"
                  onClick={onToggleVoice}
                  className="min-h-[42px] w-full flex items-center justify-between gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 text-xs sm:text-[13px] font-semibold text-white transition-colors duration-150 cursor-pointer whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-2 truncate">
                    <AudioLines className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {isVoiceActive
                        ? 'Stop live voice conversation'
                        : 'Start live voice conversation'}
                    </span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-emerald-100" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
