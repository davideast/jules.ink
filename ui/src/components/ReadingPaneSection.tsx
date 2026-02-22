import ReactMarkdown from 'react-markdown';
import { addParagraphBreaks, fixMarkdownLists } from '../lib/markdown-utils';

interface ReadingPaneSectionProps {
  title?: string;
  content: string;
  variant: 'summary' | 'status' | 'review';
}

export function ReadingPaneSection({ title, content, variant }: ReadingPaneSectionProps) {
  const isSummary = variant === 'summary';
  const isStatus = variant === 'status';
  const isReview = variant === 'review';

  const processedContent = isReview ? fixMarkdownLists(content) : addParagraphBreaks(content);

  const disallowedElements = isSummary
    ? ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'img', 'blockquote', 'pre']
    : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'blockquote', 'pre'];

  return (
    <div className="mb-[32px]">
      {title && (
        <span className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase mb-3 block">
          {title}
        </span>
      )}
      <ReactMarkdown
        disallowedElements={disallowedElements}
        unwrapDisallowed={true}
        components={{
          p: ({ node, ...props }) => (
            <p
              className={`font-light ${
                isSummary
                  ? 'text-[22px] leading-[1.7] text-[#fbfbfe] mb-4'
                  : isStatus
                  ? 'text-[15px] leading-[1.7] text-[#a0a0b0] mb-4'
                  : 'text-[14px] leading-[1.7] text-[#a0a0b0] mb-3'
              }`}
              {...props}
            />
          ),
          code: ({ node, ...props }) => (
            <code
              className={`bg-[#2a2a35] px-1.5 py-0.5 rounded font-mono ${
                isSummary
                  ? 'text-[18px]'
                  : isStatus
                  ? 'text-[13px] text-[#c0c0d0]'
                  : 'text-[12px] text-[#c0c0d0]'
              }`}
              {...props}
            />
          ),
          strong: ({ node, ...props }) =>
            isReview ? (
              <strong className="text-[#d0d0e0] font-semibold" {...props} />
            ) : (
              <strong {...props} />
            ),
          ul: ({ node, ...props }) =>
            isReview ? (
              <ul
                className="text-[14px] leading-[1.7] text-[#a0a0b0] font-light list-disc pl-5 space-y-1.5 mb-3"
                {...props}
              />
            ) : (
              <ul {...props} />
            ),
          ol: ({ node, ...props }) =>
            isReview ? (
              <ol
                className="text-[14px] leading-[1.7] text-[#a0a0b0] font-light list-decimal pl-5 space-y-1.5 mb-3"
                {...props}
              />
            ) : (
              <ol {...props} />
            ),
          li: ({ node, ...props }) =>
            isReview ? (
              <li className="text-[14px] leading-[1.7] text-[#a0a0b0] font-light" {...props} />
            ) : (
              <li {...props} />
            ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
