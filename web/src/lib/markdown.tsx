/**
 * Markdown for chat messages.
 *
 * The legacy UI used `react-markdown` + MathJax. This keeps the markdown and
 * swaps MathJax for KaTeX: same output, no concurrent-typesetting race (MathJax
 * v3 needs every `typesetPromise` call serialised, which was a real bug on the
 * other side), and it renders during the React pass instead of mutating the DOM
 * afterwards.
 *
 * Model output uses `\(...\)`/`\[...\]`, so delimiters are normalised to the
 * `$`/`$$` form remark-math understands — outside code fences only.
 */

import 'katex/dist/katex.min.css';

import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

export function normalizeMath(input: string): string {
  if (!input) return input;

  // Split on fenced code: maths inside a fence must stay literal.
  return input
    .split(/(```[\s\S]*?```)/g)
    .map((chunk, index) => {
      if (index % 2 === 1) return chunk;

      return chunk
        .replace(/\\\[([\s\S]*?)\\\]/g, (_m, body: string) => `\n$$\n${body}\n$$\n`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_m, body: string) => `$${body}$`);
    })
    .join('');
}

/**
 * Models sometimes wrap the whole answer in one ```markdown fence. Strip that
 * wrapper only — the legacy version removed every fence marker, which also
 * destroyed genuinely fenced code inside the message.
 */
export function stripMarkdownFence(input: string): string {
  const trimmed = input.trim();
  const wrapped = /^```(?:markdown)?[ \t]*\n([\s\S]*?)\n```$/.exec(trimmed);
  return wrapped ? wrapped[1].trim() : trimmed;
}

const inline = (children: ReactNode) => children;

export function Markdown({ content }: { content?: string }) {
  const source = normalizeMath(stripMarkdownFence(content ?? ''));
  if (!source) return null;

  return (
    <div className="break-words text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          p: ({ children }) => <p className="mb-3 whitespace-pre-wrap last:mb-0">{children}</p>,
          h1: ({ children }) => (
            <h1 className="mt-6 mb-3 text-xl font-semibold text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 mb-3 text-lg font-semibold text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-base font-semibold text-foreground">{children}</h3>
          ),
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-6">{children}</ol>,
          li: ({ children }) => <li className="break-words">{inline(children)}</li>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              className="underline underline-offset-2"
              target={href?.startsWith('/') ? undefined : '_blank'}
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ children, className }) => {
            const fenced = typeof className === 'string' && className.includes('language-');
            return fenced ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.85em]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-lg bg-black/5 p-3 font-mono text-xs">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-4 border-black/10 pl-4 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-black/10" />,
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto">
              <table className="w-full border-collapse border border-black/10 bg-white text-left">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-black/10 bg-black/[0.03] px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-black/10 px-3 py-2">{children}</td>,
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
