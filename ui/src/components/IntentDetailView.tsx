import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { KeyFileCard } from './KeyFileCard';

function renderTextWithCode(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-[#2a2a35] px-1 py-0.5 rounded text-[12px] font-mono text-[#c0c0d0]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export interface IntentActivity {
  index: number;
  commitMessage?: string;
  summary: string;
  activityType: string;
  createTime?: string;
}

export interface IntentDetailData {
  title: string;
  description: string;
  whatChanged: string;
  whyItChanged: string;
  files: { path: string; additions: number; deletions: number }[];
  activityIndices: number[];
  activities: IntentActivity[];
}

export interface IntentDetailViewProps {
  data: IntentDetailData;
  onBack: () => void;
  onFileClick: (filePath: string) => void;
}

export function IntentDetailView({ data, onBack, onFileClick }: IntentDetailViewProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#2a2a35] shrink-0">
        <button
          className="inline-flex items-center gap-1 text-[12px] text-[#72728a] hover:text-[#fbfbfe] transition-colors"
          onClick={onBack}
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back
        </button>
        <span className="text-[#2a2a35]">/</span>
        <span className="text-[14px] text-soft-white font-medium truncate">{data.title}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 pb-12">
        <div className="flex flex-col max-w-[600px] gap-6">
          {/* Description (persona voice) */}
          {data.description ? (
            <div>
              <ReactMarkdown
                components={{
                  p: ({ node, ...props }) => (
                    <p className="text-[15px] leading-[1.75] text-[#e4e4e7]" {...props} />
                  ),
                  code: ({ node, ...props }) => (
                    <code className="bg-[#2a2a35] px-1 py-0.5 rounded text-[12px] font-mono text-[#c0c0d0]" {...props} />
                  ),
                }}
              >
                {data.description}
              </ReactMarkdown>
            </div>
          ) : null}

          {/* What Changed */}
          <div>
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-2">What Changed</h3>
            <p className="text-[13px] text-[#b0b0c0] leading-[1.7]">{renderTextWithCode(data.whatChanged)}</p>
          </div>

          {/* Why It Changed */}
          <div>
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-2">Why It Changed</h3>
            <p className="text-[13px] text-[#b0b0c0] leading-[1.7]">{renderTextWithCode(data.whyItChanged)}</p>
          </div>

          {/* Files */}
          {data.files.length > 0 ? (
            <div>
              <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-3">Files</h3>
              <div className="flex flex-col gap-2">
                {data.files.map(f => (
                  <KeyFileCard
                    key={f.path}
                    path={f.path}
                    additions={f.additions}
                    deletions={f.deletions}
                    description=""
                    onClick={() => onFileClick(f.path)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {/* Activities — readable step timeline */}
          {data.activities.length > 0 ? (() => {
            const firstTime = data.activities[0]?.createTime
              ? new Date(data.activities[0].createTime).getTime()
              : null;

            return (
              <div>
                <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-3">Steps</h3>
                <div className="flex flex-col">
                  {data.activities.map((a, i) => {
                    const isLast = i === data.activities.length - 1;
                    // Humanize activityType: "planGenerated" → "Plan Generated"
                    const humanType = a.activityType
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, c => c.toUpperCase())
                      .trim();
                    // Relative time from first activity
                    let relTime = '';
                    if (firstTime && a.createTime) {
                      const diffMin = Math.round(
                        (new Date(a.createTime).getTime() - firstTime) / 60000,
                      );
                      relTime = diffMin === 0 ? 'start' : `+${diffMin}m`;
                    }

                    return (
                      <div key={a.index} className="flex gap-3">
                        {/* Timeline connector */}
                        <div className="flex flex-col items-center shrink-0 w-5">
                          <div className="w-2 h-2 rounded-full bg-[#3f3f4e] mt-1.5 shrink-0" />
                          {!isLast ? (
                            <div className="w-px flex-1 bg-[#2a2a35] my-1" />
                          ) : null}
                        </div>
                        {/* Content */}
                        <div className={`min-w-0 pb-${isLast ? '0' : '5'}`}>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-[12px] text-[#e4e4e7] font-medium">
                              {a.commitMessage || humanType}
                            </span>
                            {relTime ? (
                              <span className="text-[10px] text-[#52526a] font-mono shrink-0">{relTime}</span>
                            ) : null}
                          </div>
                          {a.commitMessage ? (
                            <span className="text-[10px] text-[#52526a] uppercase tracking-wider">{humanType}</span>
                          ) : null}
                          <p className="text-[12px] text-[#8e8ea0] leading-[1.6] mt-1">
                            {renderTextWithCode(a.summary)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : null}
        </div>
      </div>
    </div>
  );
}
