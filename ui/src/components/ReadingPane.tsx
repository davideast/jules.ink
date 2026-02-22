import { ReadingPaneHeader } from './ReadingPaneHeader';
import { ReadingPaneSection } from './ReadingPaneSection';
import { ReadingPaneFiles } from './ReadingPaneFiles';
import { ReadingPaneShare } from './ReadingPaneShare';
import type { FileStatRowProps } from './FileStatRow';
import type { VersionEntry } from './VersionSwitcher';

export interface ReadingPaneProps {
  toneName: string;
  modelName?: string;
  summary: string;
  files?: FileStatRowProps[];
  onShare?: () => void;
  status?: string;
  codeReview?: string;
  onFileClick?: (filePath: string) => void;
  onRegenerate?: () => void;
  regenerateLabel?: string;
  versionCount?: number;
  unidiffPatch?: string;
  versions?: Record<string, VersionEntry>;
  onVersionSelect?: (tone: string, model: string) => void;
}

export function ReadingPane({
  toneName,
  modelName,
  summary,
  files = [],
  onShare,
  status,
  codeReview,
  onFileClick,
  onRegenerate,
  regenerateLabel,
  versionCount = 0,
  unidiffPatch,
  versions = {},
  onVersionSelect = () => {},
}: ReadingPaneProps) {
  return (
    <div className="flex-1 p-[40px] overflow-y-auto custom-scrollbar">
      <div className="flex flex-col h-full max-w-[640px]">
        <ReadingPaneHeader
          toneName={toneName}
          modelName={modelName}
          versionCount={versionCount}
          versions={versions}
          onVersionSelect={onVersionSelect}
          onRegenerate={onRegenerate}
          regenerateLabel={regenerateLabel}
        />

        <ReadingPaneSection content={summary} variant="summary" />

        {status && <div className="h-px bg-[#2a2a35] w-full mb-[32px]" />}
        {status && <ReadingPaneSection title="What Happened" content={status} variant="status" />}

        {codeReview && <div className="h-px bg-[#2a2a35] w-full mb-[32px]" />}
        {codeReview && (
          <ReadingPaneSection title="Code Review" content={codeReview} variant="review" />
        )}

        <ReadingPaneFiles
          files={files}
          unidiffPatch={unidiffPatch}
          onFileClick={onFileClick}
        />

        <ReadingPaneShare onShare={onShare} />
      </div>
    </div>
  );
}
