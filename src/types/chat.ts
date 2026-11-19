export type ChatRole = 'user' | 'assistant';

export interface SourceLink {
  title: string;
  url: string;
}

export type ChatErrorCode = 'INVALID_API_KEY' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'SERVER_ERROR';

export interface ChatErrorInfo {
  code: ChatErrorCode;
  status?: number;
  message: string;
}

export type AttachmentKind = 'image' | 'video' | 'link';

export interface ChatAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  mimeType?: string;
  data?: string;
  previewUrl?: string;
  url?: string;
  sizeBytes?: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  sportContext?: string;
  attachments?: ChatAttachment[];
  sources?: SourceLink[];
  modelUsed?: string;
  isFallback?: boolean;
  isVoice?: boolean;
  isStreaming?: boolean;
  error?: ChatErrorInfo;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  title: string;
  sportContext: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface SportOption {
  value: string;
  label: string;
}

export const SPORT_OPTIONS: SportOption[] = [
  { value: 'All', label: 'All sports' },
  { value: 'Cricket', label: 'Cricket' },
  { value: 'Football (Soccer)', label: 'Football (Soccer)' },
  { value: 'Tennis', label: 'Tennis' },
  { value: 'Basketball', label: 'Basketball' },
  { value: 'Formula 1', label: 'Formula 1' },
  { value: 'Hockey', label: 'Hockey' },
  { value: 'Kabaddi', label: 'Kabaddi' },
  { value: 'Badminton', label: 'Badminton' },
  { value: 'Athletics & Olympics', label: 'Athletics & Olympics' },
  { value: 'American Football', label: 'American Football' },
  { value: 'Baseball', label: 'Baseball' },
  { value: 'Esports', label: 'Esports' },
];

export interface QuickAction {
  label: string;
  buildPrompt: (selectedSport: string) => string;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Live scores today',
    buildPrompt: (sport) =>
      sport !== 'All'
        ? `What are today's live and latest ${sport} scores and results?`
        : 'What are the major live scores and results happening today across global sports?',
  },
  {
    label: 'Cricket news',
    buildPrompt: () => 'What is the latest global cricket news, results, and upcoming series updates?',
  },
  {
    label: 'Football standings',
    buildPrompt: () => 'Show the current standings for the top football (soccer) leagues right now.',
  },
  {
    label: 'Tennis rankings',
    buildPrompt: () => 'What are the latest ATP and WTA tennis singles rankings?',
  },
  {
    label: 'Upcoming matches',
    buildPrompt: (sport) =>
      sport !== 'All'
        ? `What are the key upcoming ${sport} matches and fixtures this week?`
        : 'What are the biggest upcoming matches and events across major sports this week?',
  },
  {
    label: 'Explain a rule',
    buildPrompt: (sport) =>
      sport !== 'All'
        ? `Explain an important or commonly misunderstood rule in ${sport} clearly with an example.`
        : 'Explain an interesting or commonly misunderstood rule in sports (and ask which sport rule I would like to explore next).',
  },
];
