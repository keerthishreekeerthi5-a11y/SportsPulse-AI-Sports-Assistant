import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { Part } from '@google/genai';
import type { Response } from 'express';

const MULTIMODAL_MODEL = 'gemini-4-hydrogen';
const MULTIMODAL_FALLBACK_MODEL = 'gemini-3.1-flash-lite';

export interface ServerAttachmentInput {
  kind: 'image' | 'video' | 'link';
  name: string;
  mimeType?: string;
  data?: string;
  url?: string;
}

export interface ServerChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ServerAttachmentInput[];
}

interface SourceLink {
  title: string;
  url: string;
}

function writeSseEvent(res: Response, payload: Record<string, unknown>): void {
  if (!res.writableEnded) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

function toValidSource(rawUrl: unknown, rawTitle: unknown): SourceLink | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null;

  let hostname = trimmed;
  try {
    hostname = new URL(trimmed).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }

  const title =
    typeof rawTitle === 'string' && rawTitle.trim().length > 0
      ? rawTitle.trim()
      : hostname;

  return { title, url: trimmed };
}

function isSafePublicHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host.startsWith('169.254.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort lightweight page reader (3.5s timeout) so static sports articles/pages
 * provide immediate text context alongside live web search / urlContext.
 * Returns null cleanly if a site is JS-rendered or returns a bot challenge (e.g. 202/403).
 */
export async function fetchLinkTextPreview(
  url: string,
  parentSignal: AbortSignal
): Promise<{ title?: string; excerpt: string } | null> {
  if (!isSafePublicHttpUrl(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  const onParentAbort = () => controller.abort();
  parentSignal.addEventListener('abort', onParentAbort, { once: true });

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return null;
    }

    const html = await res.text();
    if (!html || html.length < 150) return null;

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.replace(/\s+/g, ' ').trim();

    const metaDescMatch =
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const metaDesc = metaDescMatch?.[1]?.replace(/\s+/g, ' ').trim();

    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, ' ')
      .trim();

    const combined = [metaDesc, stripped].filter(Boolean).join('\n').slice(0, 3500).trim();
    if (combined.length < 80) return null;

    return { title, excerpt: combined };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    parentSignal.removeEventListener('abort', onParentAbort);
  }
}

/**
 * Enriches a user message that contains attached or pasted links with any fast
 * server-fetched page preview and clear live-search instructions.
 */
export async function buildLinkEnrichedPrompt(
  rawText: string,
  attachedLinks: string[],
  signal: AbortSignal
): Promise<{ prompt: string; urls: string[] }> {
  const inlineUrls = rawText.match(/https?:\/\/[^\s)>\]"']+/gi) ?? [];
  const urls = [...new Set([...attachedLinks, ...inlineUrls])];

  const previews = await Promise.all(
    urls.slice(0, 3).map(async (u) => ({
      url: u,
      preview: await fetchLinkTextPreview(u, signal),
    }))
  );

  const extractedBlocks = previews
    .filter((p) => p.preview !== null)
    .map(
      (p) =>
        `Fetched page content from ${p.url}${p.preview?.title ? ` (${p.preview.title})` : ''}:\n${p.preview?.excerpt}`
    );

  const linksList = urls.map((u) => `- ${u}`).join('\n');
  const baseQuestion =
    rawText.trim() ||
    'Summarize the sports information in the attached link(s) and highlight key live scores, standings, or news updates.';

  const sections: string[] = [
    baseQuestion,
    `\nUser-provided sports link(s):\n${linksList}`,
  ];

  if (extractedBlocks.length > 0) {
    sections.push(`\nExtracted page content:\n${extractedBlocks.join('\n\n')}`);
  } else {
    sections.push(
      '\nDirect HTML fetch for this link returned a dynamic/protected page. Use web search to inspect the URL and retrieve the live scores, fixtures, standings, or news corresponding to this page topic (e.g. live cricket scores for espn.com/cricket/scores), then give a clear, verified summary with today\'s date.'
    );
  }

  return { prompt: sections.join('\n'), urls };
}

function parseGeminiErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : String(error || 'Unable to analyze media or links.');
  let current = raw.trim();

  for (let depth = 0; depth < 3; depth++) {
    if (!current.startsWith('{')) break;
    try {
      const parsed = JSON.parse(current) as { error?: { message?: string }; message?: string };
      const inner = parsed?.error?.message ?? parsed?.message;
      if (typeof inner === 'string' && inner.trim().length > 0) {
        current = inner.trim();
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return current;
}

function isAuthError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('permission_denied') ||
    lower.includes('401') ||
    lower.includes('403')
  );
}

function isQuotaError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  );
}

/**
 * Handles multimodal (image, video) and fallback link/URL sports questions via
 * Gemini's gemini-4-hydrogen (ThinkingLevel.LOW) and gemini-3.1-flash-lite.
 */
export async function callGeminiMultimodalChat(options: {
  systemPrompt: string;
  messages: ServerChatMessageInput[];
  res: Response;
  signal: AbortSignal;
}): Promise<void> {
  const { systemPrompt, messages, res, signal } = options;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(401).json({
      error: {
        code: 'INVALID_API_KEY',
        message:
          'GEMINI_API_KEY is not configured. Add your Gemini API key in Settings > Secrets to analyze images, videos, and links.',
      },
    });
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'SportsPulse',
      },
    },
  });

  const multimodalSystemPrompt = `${systemPrompt}

MULTIMODAL & LINK ANALYSIS INSTRUCTIONS:
- When the user attaches images, videos, or web links, analyze them carefully to answer their sports-related doubts (rules, fouls, umpire/referee decisions, batting/bowling/shooting/swing technique, tactical formations, scorecards, live scores, match reports, or player/equipment identification).
- If an uploaded image, video, or link is clearly NOT related to sports, politely decline to analyze or answer it and ask for a sports-related query or media instead.`;

  try {
    const contents: Array<{ role: 'user' | 'model'; parts: Part[] }> = [];
    let hasLinks = false;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLatest = i === messages.length - 1;
      const parts: Part[] = [];
      const linkUrls: string[] = [];

      // Attach media only on the latest turn
      if (isLatest && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att.kind === 'link' && att.url) {
            hasLinks = true;
            linkUrls.push(att.url);
            continue;
          }

          if (
            (att.kind === 'image' || att.kind === 'video') &&
            typeof att.data === 'string' &&
            att.data.length > 0
          ) {
            const mimeType =
              att.mimeType || (att.kind === 'image' ? 'image/jpeg' : 'video/mp4');
            const cleanBase64 = att.data.includes(',')
              ? att.data.split(',')[1]
              : att.data;
            const buffer = Buffer.from(cleanBase64, 'base64');

            // Use Gemini Files API for larger video clips (> 4 MB), inlineData for smaller media
            if (att.kind === 'video' && buffer.byteLength > 4 * 1024 * 1024) {
              const uploaded = await ai.files.upload({
                file: new Blob([buffer], { type: mimeType }),
                config: { mimeType, displayName: att.name || 'sports-video' },
              });

              let fileMeta = uploaded;
              let attempts = 0;
              while (fileMeta.state === 'PROCESSING' && attempts < 20 && !signal.aborted) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
                if (!fileMeta.name) break;
                fileMeta = await ai.files.get({ name: fileMeta.name });
                attempts++;
              }

              if (fileMeta.state === 'FAILED') {
                throw new Error(
                  'Uploaded video could not be processed. Try a shorter MP4 or WebM clip.'
                );
              }

              if (fileMeta.uri) {
                parts.push({
                  fileData: {
                    fileUri: fileMeta.uri,
                    mimeType: fileMeta.mimeType || mimeType,
                  },
                });
              }
            } else {
              parts.push({
                inlineData: {
                  data: cleanBase64,
                  mimeType,
                },
              });
            }
          }
        }
      }

      if (signal.aborted) return;

      const inlineUrls = msg.content.match(/https?:\/\/[^\s)>\]"']+/gi) ?? [];
      if (inlineUrls.length > 0) {
        hasLinks = true;
      }

      let textContent = msg.content.trim();
      if (isLatest && (linkUrls.length > 0 || inlineUrls.length > 0)) {
        const enriched = await buildLinkEnrichedPrompt(textContent, linkUrls, signal);
        textContent = enriched.prompt;
      } else if (!textContent && parts.length > 0) {
        textContent =
          'Please analyze the attached sports media and explain what is happening or answer any key sports points about it.';
      }

      if (textContent) {
        parts.push({ text: textContent });
      }

      if (parts.length > 0) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts,
        });
      }
    }

    type AttemptConfig = {
      model: string;
      useLowThinking?: boolean;
      tools?: Array<Record<string, Record<string, never>>>;
    };

    // Avoid coupling googleSearch when it triggers free-tier 429s; fall back cleanly through urlContext & direct multimodal
    const attempts: AttemptConfig[] = [];
    if (hasLinks) {
      attempts.push({
        model: MULTIMODAL_MODEL,
        useLowThinking: true,
        tools: [{ urlContext: {} }],
      });
      attempts.push({
        model: MULTIMODAL_FALLBACK_MODEL,
        tools: [{ urlContext: {} }],
      });
      attempts.push({
        model: MULTIMODAL_FALLBACK_MODEL,
      });
    } else {
      attempts.push({
        model: MULTIMODAL_MODEL,
        useLowThinking: true,
      });
      attempts.push({
        model: MULTIMODAL_FALLBACK_MODEL,
      });
    }

    let lastError: unknown = null;

    for (const attempt of attempts) {
      if (signal.aborted) return;
      let sentAnyToken = false;

      try {
        const stream = await ai.models.generateContentStream({
          model: attempt.model,
          contents,
          config: {
            systemInstruction: multimodalSystemPrompt,
            ...(attempt.useLowThinking
              ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
              : {}),
            ...(attempt.tools ? { tools: attempt.tools } : {}),
            abortSignal: signal,
          },
        });

        const seenUrls = new Set<string>();
        let startedStream = false;

        for await (const chunk of stream) {
          if (signal.aborted) break;

          if (!startedStream) {
            startedStream = true;
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
              res.setHeader('Cache-Control', 'no-cache, no-transform');
              res.setHeader('Connection', 'keep-alive');
            }
            writeSseEvent(res, {
              type: 'meta',
              model: attempt.model,
              isFallback: false,
            });
          }

          if (chunk.text) {
            sentAnyToken = true;
            writeSseEvent(res, { type: 'token', content: chunk.text });
          }

          const candidate = chunk.candidates?.[0];
          const freshSources: SourceLink[] = [];

          const groundingChunks = candidate?.groundingMetadata?.groundingChunks ?? [];
          for (const gc of groundingChunks) {
            const link = toValidSource(gc.web?.uri, gc.web?.title);
            if (link && !seenUrls.has(link.url)) {
              seenUrls.add(link.url);
              freshSources.push(link);
            }
          }

          const urlMeta = candidate?.urlContextMetadata?.urlMetadata ?? [];
          for (const um of urlMeta) {
            const link = toValidSource(um.retrievedUrl, undefined);
            if (link && !seenUrls.has(link.url)) {
              seenUrls.add(link.url);
              freshSources.push(link);
            }
          }

          if (freshSources.length > 0) {
            writeSseEvent(res, { type: 'sources', sources: freshSources });
          }
        }

        if (!signal.aborted) {
          if (!startedStream && !res.headersSent) {
            res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            writeSseEvent(res, {
              type: 'meta',
              model: attempt.model,
              isFallback: false,
            });
          }
          writeSseEvent(res, { type: 'done' });
          res.end();
        }
        return;
      } catch (attemptErr) {
        if (signal.aborted) return;
        lastError = attemptErr;
        const parsedMsg = parseGeminiErrorMessage(attemptErr);
        console.error(`[Gemini multimodal ${attempt.model}] error=${parsedMsg}`);

        if (isAuthError(parsedMsg) || sentAnyToken) {
          break;
        }
      }
    }

    throw lastError ?? new Error('Unable to analyze media or links right now.');
  } catch (error) {
    if (signal.aborted) return;

    const msg = parseGeminiErrorMessage(error);
    const isAuth = isAuthError(msg);
    const isRate = isQuotaError(msg);

    const status = isAuth ? 401 : isRate ? 429 : 502;
    const code = isAuth ? 'INVALID_API_KEY' : isRate ? 'RATE_LIMIT' : 'SERVER_ERROR';

    const friendlyMsg = isAuth
      ? 'Your GEMINI_API_KEY appears invalid or lacks permission. Please check your Gemini API key in Settings > Secrets.'
      : isRate
        ? 'Gemini API quota limit reached for media analysis. Please wait a moment and try again.'
        : msg;

    if (!res.headersSent) {
      res.status(status).json({ error: { code, message: friendlyMsg } });
    } else {
      writeSseEvent(res, { type: 'error', code, status, message: friendlyMsg });
      res.end();
    }
  }
}
