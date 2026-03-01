import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { KeyFileCard } from './KeyFileCard';
import { IntentDetailTimeline } from './IntentDetailTimeline';
import type { IntentActivity } from './IntentDetailTimeline';
import { IntentDetailSection } from './IntentDetailSection';

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
          <IntentDetailSection title="What Changed" content={data.whatChanged} />

          {/* Why It Changed */}
          <IntentDetailSection title="Why It Changed" content={data.whyItChanged} />

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
          <IntentDetailTimeline activities={data.activities} />
        </div>
      </div>
    </div>
  );
}
