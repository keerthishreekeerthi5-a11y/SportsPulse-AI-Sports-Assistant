import type { ChatErrorInfo, ChatMessage, SourceLink } from '../types/chat';

export interface StreamHandlers {
  onMeta: (meta: { model: string; isFallback: boolean }) => void;
  onToken: (token: string) => void;
  onSources: (sources: SourceLink[]) => void;
  onDone: () => void;
}

export class SportsApiError extends Error {
  public readonly info: ChatErrorInfo;

  constructor(info: ChatErrorInfo) {
    super(info.message);
    this.info = info;
  }
}

/**
 * Isolated client API function that streams responses token-by-token
 * from the /api/chat backend proxy (which calls Groq's Chat Completions API).
 */
export async function streamSportsChat(
  messages: Pick<ChatMessage, 'role' | 'content' | 'attachments'>[],
  sport: string,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  let response: Response;

  const payloadMessages = messages.map((msg, idx) => {
    const isLatest = idx === messages.length - 1;
    if (!isLatest || !msg.attachments || msg.attachments.length === 0) {
      return { role: msg.role, content: msg.content };
    }
    return {
      role: msg.role,
      content: msg.content,
      attachments: msg.attachments.map((att) => ({
        kind: att.kind,
        name: att.name,
        mimeType: att.mimeType,
        data: att.data,
        url: att.url,
      })),
    };
  });

  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: payloadMessages, sport }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    throw new SportsApiError({
      code: 'NETWORK_ERROR',
      message: 'Network connection failed. Check your internet connection and try again.',
    });
  }

  if (!response.ok) {
    let errorInfo: ChatErrorInfo = {
      code:
        response.status === 401
          ? 'INVALID_API_KEY'
          : response.status === 429
            ? 'RATE_LIMIT'
            : 'SERVER_ERROR',
      status: response.status,
      message:
        response.status === 401
          ? 'Invalid or missing Groq API key. Configure GROQ_API_KEY in environment secrets.'
          : response.status === 429
            ? 'Too many requests right now. Please wait a few seconds and try again.'
            : `Server returned an unexpected error (${response.status}).`,
    };

    try {
      const json = (await response.json()) as { error?: Partial<ChatErrorInfo> };
      if (json?.error?.message) {
        errorInfo = {
          code: json.error.code ?? errorInfo.code,
          status: response.status,
          message: json.error.message,
        };
      }
    } catch {
      // Keep default friendly error message
    }

    throw new SportsApiError(errorInfo);
  }

  if (!response.body) {
    throw new SportsApiError({
      code: 'SERVER_ERROR',
      message: 'Empty response stream received from server.',
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedDone = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;

        const payloadStr = line.slice(5).trim();
        if (!payloadStr) continue;

        let event: {
          type: 'meta' | 'token' | 'sources' | 'done' | 'error';
          model?: string;
          isFallback?: boolean;
          content?: string;
          sources?: SourceLink[];
          code?: ChatErrorInfo['code'];
          status?: number;
          message?: string;
        };

        try {
          event = JSON.parse(payloadStr);
        } catch {
          continue;
        }

        if (event.type === 'meta' && event.model) {
          handlers.onMeta({
            model: event.model,
            isFallback: Boolean(event.isFallback),
          });
        } else if (event.type === 'token' && typeof event.content === 'string') {
          handlers.onToken(event.content);
        } else if (event.type === 'sources' && Array.isArray(event.sources)) {
          handlers.onSources(event.sources);
        } else if (event.type === 'done') {
          receivedDone = true;
          handlers.onDone();
        } else if (event.type === 'error') {
          throw new SportsApiError({
            code: event.code ?? 'SERVER_ERROR',
            status: event.status,
            message: event.message ?? 'Streaming error occurred.',
          });
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!receivedDone) {
    handlers.onDone();
  }
}
