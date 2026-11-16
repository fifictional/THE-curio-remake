import { MathJax } from "better-react-mathjax";
import Markdown from "react-markdown"
import remarkGfm from 'remark-gfm';
import React from 'react';
import rehypeRaw from 'rehype-raw';
import { normalizeMathForMathJax } from '@/lib/normalize-math-for-mathjax';

/**
 * MathJax only earns its keep when the text contains maths. Most summaries,
 * flashcards and answers do not: wrapping them anyway starts one
 * `typesetPromise` per block (51 for a single study guide), and every one of
 * those rejects with "Typesetting failed: … nextSibling" when React replaces
 * the block mid-run. Skip it entirely when there is nothing to typeset.
 */
const MATH_DELIMITERS = /\\\(|\\\[|\$\$|\\begin\{/;

export const CurioMarkdown = ({ content, highlightRange }: { content?: string, highlightRange?: { start: number, end: number } | null }) => {
  // Fix spacing around horizontal rules
  let processedContent = (content ?? '')
    // Remove markdown code block wrapper
    .replace(/```markdown\n?/g, '')
    .replace(/```\n?/g, '')
    // Fix spacing around horizontal rules
    .replace(/\n---\n/g, '\n\n---\n')
    // Remove HTML br tags
    .replace(/<br>/g, '')
    // Ensure proper spacing after headers
    .replace(/(#+\s+[^\n]+)\n/g, '$1\n\n')
    // Ensure proper spacing around paragraphs
    .replace(/\n\n+/g, '\n\n')
    // Ensure content doesn't start with extra whitespace
    .trim();
  // Wrap bare LaTeX (e.g. "\pi") and common MC shapes so MathJax sees \(...\) delimiters
  processedContent = normalizeMathForMathJax(processedContent);
  // Inject optional highlight using <mark>. We allow raw HTML via rehypeRaw.
  if (highlightRange && processedContent) {
    const start = Math.min(processedContent.length, Math.max(0, highlightRange.start));
    const end = Math.min(processedContent.length, Math.max(start, highlightRange.end));
    processedContent = `${processedContent.slice(0, start)}<mark class="bg-yellow-200 rounded px-0.5">${processedContent.slice(start, end)}</mark>${processedContent.slice(end)}`;
  }

  const hasMath = MATH_DELIMITERS.test(processedContent);
  // Plain text needs no wrapper at all; maths is typeset per leaf block.
  const withMath = (children: React.ReactNode) => (hasMath ? <MathJax>{children}</MathJax> : children);

  return <Markdown 
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={{
      h1: ({ children }) => <h1 className="text-xl font-semibold mb-3 text-gray-800 mt-6">{children}</h1>,
      h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-gray-800 mt-6">{children}</h2>,
      h3: ({ children }) => <h3 className="text-lg font-medium mb-1 text-gray-800 mt-4">{children}</h3>,
      p: ({ children, ...props }) => {
        // Check if children contain block-level elements that shouldn't be in p tags
        const hasBlockElements = React.Children.toArray(children).some(child => {
          if (typeof child === 'string') return false;
          if (React.isValidElement(child)) {
            const tagName = typeof child.type === 'string' ? child.type : 'unknown';
            return ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'ul', 'ol', 'blockquote'].includes(tagName);
          }
          return false;
        });
        
        // If children contain block elements, render as div instead of p
        if (hasBlockElements) {
          // No MathJax wrapper here: this div's children are block elements that
          // typeset themselves. Nesting the two makes MathJax walk the same DOM
          // twice and throw "Typesetting failed: … nextSibling".
          return <div className="mb-3 leading-relaxed break-words">{children}</div>;
        }
        
        return <p className="leading-relaxed break-words" {...props}>{withMath(children)}</p>;
      },
      table: ({ children }) => (
        <div className="overflow-x-auto my-6">
          <table className="w-full border-collapse border border-gray-300 bg-white rounded-lg shadow-sm">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
      tbody: ({ children }) => <tbody>{children}</tbody>,
      tr: ({ children }) => <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">{children}</tr>,
      th: ({ children }) => (
        <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800 bg-gray-50 break-words">
          {withMath(children)}
        </th>
      ),
      td: ({ children }) => (
        <td className="border border-gray-300 px-4 py-3 text-gray-800 leading-relaxed break-words">
          {withMath(children)}
        </td>
      ),
      ul: ({ children }) => <ul className="list-disc space-y-1 mt-0 pl-8 mb-3 [li>*>&]:mb-0">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal space-y-1 mt-0 pl-8 mb-3 [li>*>&]:mb-0">{children}</ol>,
      li: ({ children }) => <li className="text-gray-800 break-words">
        {withMath(children)}
      </li>,
      strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
      em: ({ children }) => <em className="italic text-gray-800">{children}</em>,
      code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800 break-words">{children}</code>,
      pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded mb-3 overflow-x-auto break-words whitespace-pre-wrap">{children}</pre>,
      blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-800 mb-3 break-words">{children}</blockquote>,
      hr: () => <hr className="border-gray-300 my-6" />,
      a: ({ children, href, ...props }) => {
        const isCurioDomain = href && (href.startsWith('/') || href.includes('app.curio.to'));
        return (
          <a 
            className="text-gray-800 underline hover:text-gray-800 inline-block break-words" 
            href={href}
            target={isCurioDomain ? undefined : '_blank'}
            rel={isCurioDomain ? undefined : 'noopener noreferrer'}
            {...props}
          >
            {children}
          </a>
        );
      },
    }}
  >
    {processedContent}
  </Markdown>
}