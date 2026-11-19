import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ClipboardEvent, DragEvent, FormEvent, KeyboardEvent, MutableRefObject } from 'react';
import {
  AlertCircle,
  ArrowUp,
  AudioLines,
  ChevronDown,
  Film,
  ImagePlus,
  Link2,
  Square,
  Video,
  X,
} from 'lucide-react';
import { QUICK_ACTIONS, SPORT_OPTIONS } from '../types/chat';
import type { ChatAttachment } from '../types/chat';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB

export interface ComposerActionsHandle {
  openImagePicker: () => void;
  openVideoPicker: () => void;
  openLinkInput: () => void;
}

interface ComposerBarProps {
  input: string;
  onInputChange: (value: string) => void;
  attachments: ChatAttachment[];
  onAddAttachments: (items: ChatAttachment[]) => void;
  onRemoveAttachment: (id: string) => void;
  selectedSport: string;
  onSelectSport: (sport: string) => void;
  isStreaming: boolean;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  onSubmit: () => void;
  onStop: () => void;
  showInlineQuickChips: boolean;
  onSelectQuickAction: (prompt: string) => void;
  actionsRef?: MutableRefObject<ComposerActionsHandle | null>;
}

function createAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Could not read file "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export function ComposerBar({
  input,
  onInputChange,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  selectedSport,
  onSelectSport,
  isStreaming,
  isVoiceActive,
  onToggleVoice,
  onSubmit,
  onStop,
  showInlineQuickChips,
  onSelectQuickAction,
  actionsRef,
}: ComposerBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [isTextareaScrollable, setIsTextareaScrollable] = useState(false);

  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = {
      openImagePicker: () => imageInputRef.current?.click(),
      openVideoPicker: () => videoInputRef.current?.click(),
      openLinkInput: () => {
        setShowLinkInput(true);
        requestAnimationFrame(() => linkInputRef.current?.focus());
      },
    };
    return () => {
      actionsRef.current = null;
    };
  }, [actionsRef]);

  const canSend = !isStreaming && (input.trim().length > 0 || attachments.length > 0);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setIsTextareaScrollable(false);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSend) {
      setAttachmentError(null);
      onSubmit();
      resetTextareaHeight();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        setAttachmentError(null);
        onSubmit();
        resetTextareaHeight();
      }
    }
  };

  const handleTextareaInput = (value: string) => {
    onInputChange(value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      const nextHeight = Math.min(el.scrollHeight, 144);
      el.style.height = `${nextHeight}px`;
      setIsTextareaScrollable(el.scrollHeight > 144);
    }
  };

  const handleImageFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);
    const created: ChatAttachment[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setAttachmentError(`"${file.name}" is not a supported image file.`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setAttachmentError(`Image "${file.name}" exceeds the 10 MB limit.`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        created.push({
          id: createAttachmentId(),
          kind: 'image',
          name: file.name,
          mimeType: file.type || 'image/jpeg',
          data: dataUrl,
          previewUrl: dataUrl,
          sizeBytes: file.size,
        });
      } catch (err) {
        setAttachmentError(err instanceof Error ? err.message : 'Failed to load image.');
      }
    }

    if (created.length > 0) {
      onAddAttachments(created);
    }
  };

  const handleVideoFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    setAttachmentError(null);
    const file = Array.from(files)[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setAttachmentError(`"${file.name}" is not a supported video file.`);
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setAttachmentError(`Video "${file.name}" exceeds the 20 MB limit. Try a shorter clip.`);
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const previewUrl = URL.createObjectURL(file);
      onAddAttachments([
        {
          id: createAttachmentId(),
          kind: 'video',
          name: file.name,
          mimeType: file.type || 'video/mp4',
          data: dataUrl,
          previewUrl,
          sizeBytes: file.size,
        },
      ]);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : 'Failed to load video.');
    }
  };

  const handleImageInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    await handleImageFiles(e.target.files);
    e.target.value = '';
  };

  const handleVideoInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    await handleVideoFiles(e.target.files);
    e.target.value = '';
  };

  const handlePaste = async (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = e.clipboardData?.files;
    if (pastedFiles && pastedFiles.length > 0) {
      const hasImage = Array.from(pastedFiles).some((f) => f.type.startsWith('image/'));
      if (hasImage) {
        e.preventDefault();
        await handleImageFiles(pastedFiles);
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLFormElement>) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      setIsDraggingMedia(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLFormElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingMedia(false);
  };

  const handleDrop = async (e: DragEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDraggingMedia(false);
    if (isStreaming) return;
    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (dropped.length === 0) return;

    const images = dropped.filter((f) => f.type.startsWith('image/'));
    const videos = dropped.filter((f) => f.type.startsWith('video/'));

    if (images.length > 0) {
      await handleImageFiles(images);
    }
    if (videos.length > 0) {
      await handleVideoFiles(videos);
    }
    if (images.length === 0 && videos.length === 0) {
      setAttachmentError('Only image or video files can be dropped here.');
    }
  };

  const handleAddLink = () => {
    const raw = linkDraft.trim();
    if (!raw) return;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(normalized);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setAttachmentError('Please enter a valid http:// or https:// link.');
        return;
      }
      setAttachmentError(null);
      onAddAttachments([
        {
          id: createAttachmentId(),
          kind: 'link',
          name: parsed.hostname.replace(/^www\./, ''),
          url: parsed.toString(),
          previewUrl: parsed.toString(),
        },
      ]);
      setLinkDraft('');
      setShowLinkInput(false);
    } catch {
      setAttachmentError('Please enter a valid web URL (e.g. https://www.espncricinfo.com/...).');
    }
  };

  return (
    <div className="shrink-0 border-t border-slate-200/90 dark:border-slate-800/90 bg-white/90 dark:bg-[#0B111C]/90 backdrop-blur-md px-3 sm:px-6 py-3">
      <div className="max-w-4xl mx-auto">
        {showInlineQuickChips && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-1 no-scrollbar">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={isStreaming}
                onClick={() => onSelectQuickAction(action.buildPrompt(selectedSport))}
                className="shrink-0 whitespace-nowrap rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-600/60 dark:hover:border-emerald-500/60 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => void handleImageInputChange(e)}
          className="hidden"
          aria-hidden="true"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => void handleVideoInputChange(e)}
          className="hidden"
          aria-hidden="true"
        />

        <form
          onSubmit={handleFormSubmit}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => void handleDrop(e)}
          className={`rounded-2xl border transition-all p-2 space-y-2 ${
            isDraggingMedia
              ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/35 ring-2 ring-emerald-600/25'
              : 'border-slate-300/90 dark:border-slate-700/90 bg-slate-50/80 dark:bg-[#0F1725] focus-within:border-emerald-600 dark:focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-600/15'
          }`}
        >
          {/* Attachment error message */}
          {attachmentError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-800 dark:text-red-200"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                <span className="truncate">{attachmentError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachmentError(null)}
                aria-label="Dismiss attachment error"
                className="shrink-0 text-red-600 dark:text-red-400 hover:opacity-80 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Queued attachment previews */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-1 pt-1">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pr-1.5 pl-2 py-1.5 max-w-[240px]"
                >
                  {att.kind === 'image' && att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-md object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                    />
                  ) : att.kind === 'video' ? (
                    <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                      <Link2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                      {att.kind === 'link' ? att.url : att.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {att.kind === 'link'
                        ? 'Web link'
                        : `${att.kind === 'image' ? 'Image' : 'Video'}${
                            att.sizeBytes ? ` · ${formatFileSize(att.sizeBytes)}` : ''
                          }`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(att.id)}
                    aria-label={`Remove ${att.name}`}
                    className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Inline Link Input */}
          {showLinkInput && (
            <div className="flex items-center gap-2 px-1">
              <input
                type="url"
                value={linkDraft}
                onChange={(e) => setLinkDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                  } else if (e.key === 'Escape') {
                    setShowLinkInput(false);
                  }
                }}
                placeholder="Paste a sports article, scorecard, or match link (https://...)"
                aria-label="Sports link URL"
                autoFocus
                className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                Add link
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkDraft('');
                }}
                aria-label="Cancel adding link"
                className="shrink-0 min-h-[38px] px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Main composer row */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            {/* Sport filter + media attach controls */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
              <div className="relative shrink-0">
                <label htmlFor="sport-filter" className="sr-only">
                  Filter by sport
                </label>
                <select
                  id="sport-filter"
                  value={selectedSport}
                  onChange={(e) => onSelectSport(e.target.value)}
                  disabled={isStreaming}
                  className="appearance-none min-h-[42px] pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 cursor-pointer disabled:opacity-60"
                >
                  {SPORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
              </div>

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isStreaming}
                aria-label="Upload sports image"
                title="Upload sports image (max 10 MB) or drag & drop"
                className="min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-emerald-600/50 transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <ImagePlus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={isStreaming}
                aria-label="Upload sports video"
                title="Upload sports video clip (max 20 MB) or drag & drop"
                className="min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-emerald-600/50 transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowLinkInput((prev) => !prev)}
                disabled={isStreaming}
                aria-label="Attach sports link"
                title="Attach a sports link or article URL"
                className={`min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl border transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                  showLinkInput
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-emerald-600/50'
                }`}
              >
                <Link2 className="w-4 h-4" />
              </button>
            </div>

            {/* Text input + Voice + Send/Stop */}
            <div className="flex items-end gap-2 flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => handleTextareaInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={(e) => void handlePaste(e)}
                placeholder={
                  isDraggingMedia
                    ? 'Drop image or video clip to attach...'
                    : attachments.length > 0
                      ? 'Ask your doubt about the attached image, video, or link...'
                      : selectedSport === 'All'
                        ? 'Ask about any sport, or drop/upload an image, video, or link...'
                        : `Ask about ${selectedSport}, or attach an image, video, or link...`
                }
                aria-label="Ask a sports question"
                className="w-full resize-none bg-transparent px-2 py-2.5 text-sm sm:text-[15px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none max-h-36 leading-snug"
              />

              <button
                type="button"
                onClick={onToggleVoice}
                disabled={isStreaming}
                aria-label={isVoiceActive ? 'Stop voice conversation' : 'Start voice conversation'}
                title={isVoiceActive ? 'Stop voice conversation' : 'Start voice conversation'}
                className={`shrink-0 min-h-[42px] px-3 inline-flex items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 whitespace-nowrap ${
                  isVoiceActive
                    ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <AudioLines className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{isVoiceActive ? 'Live' : 'Voice'}</span>
              </button>

              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop response"
                  title="Stop response"
                  className="shrink-0 min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl bg-slate-950 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Send message"
                  title="Send message"
                  className="shrink-0 min-h-[42px] min-w-[42px] inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
