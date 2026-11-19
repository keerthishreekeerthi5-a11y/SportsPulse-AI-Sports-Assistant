import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="text-[15px] leading-[1.68] text-slate-800 dark:text-slate-200 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950 dark:text-white mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display text-xl font-bold tracking-tight text-slate-950 dark:text-white mt-4 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-slate-950 dark:text-white mt-3.5 mb-1.5 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 last:mb-0 pl-5 space-y-1.5 list-disc marker:text-emerald-600 dark:marker:text-emerald-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 last:mb-0 pl-5 space-y-1.5 list-decimal marker:text-emerald-600 dark:marker:text-emerald-400 marker:font-medium">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-emerald-700 dark:text-emerald-400 underline decoration-emerald-600/40 underline-offset-2 hover:decoration-emerald-600 dark:hover:decoration-emerald-400 transition-colors"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-slate-200 dark:border-slate-800" />,
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className?.includes('language-'));
            if (!isBlock) {
              return (
                <code
                  className="font-mono text-[13px] rounded px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-3.5 text-[13px] text-slate-100 font-mono">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="my-4 w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60">
              <table className="w-full border-collapse text-left text-[13px] tabular-nums">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold whitespace-nowrap">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap sm:whitespace-normal">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
