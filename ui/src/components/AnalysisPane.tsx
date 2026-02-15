import { useState, useRef, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { highlight } from 'sugar-high';
import { MODELS } from './ModelSelector';
import { KeyFileCard } from './KeyFileCard';
import { IntentCard } from './IntentCard';
import { FileTree } from './FileTree';
import type { FileTreeNode } from './FileTree';
import type { VersionEntry } from './ReadingPane';
import type { Intent, IntentDescription, AgentTrace, CodeRefMap } from '../lib/session-analysis';
import { extractLineRange } from '../lib/diff-utils';
import type { DiffLine } from '../lib/diff-utils';

/** Matches backtick content that looks like a project file path with a source extension. */
const FILE_PATH_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.\-\/]*\.(ts|tsx|js|jsx|json|css|scss|html|md|yaml|yml|toml|py|go|rs|java|rb|sh|mjs|cjs|astro|svelte|vue)$/;

/** Renders text with backtick-wrapped segments as plain inline <code> (no clickable files). */
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

/**
 * Parses "**Bold Label**: rest of text" into { label, body }.
 * If no bold prefix found, returns null so caller can fall back.
 */
function parseBoldLead(text: string): { label: string; body: string } | null {
  const match = text.match(/^\*\*(.+?)\*\*[:\s]+(.+)$/s);
  if (!match) return null;
  return { label: match[1], body: match[2] };
}

interface LabeledItemProps {
  text: string;
  index: number;
  sectionKey: string;
  onFileClick?: (f: string) => void;
  fileDiffs?: Map<string, string>;
  codeRefs?: CodeRefMap;
}

/** Renders a list item with a bold lead and explanation, with expandable code snippets. */
function LabeledItem({ text, index, sectionKey, onFileClick, fileDiffs, codeRefs }: LabeledItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const parsed = parseBoldLead(text);
  const fileRefs = extractFileRefs(text);

  const refKey = `${sectionKey}:${index}`;
  const refs = codeRefs?.[refKey];
  const hasRefs = refs && refs.length > 0 && fileDiffs && fileDiffs.size > 0;

  return (
    <div className="flex gap-3 py-2">
      <span className="mt-[3px] shrink-0 text-[16px] leading-none select-none text-[#3f3f4e]">&#x25B8;</span>
      <div className="min-w-0 flex-1">
      {parsed ? (
        <p className="text-[13px] leading-[1.7] text-[#b0b0c0]">
          <span className="text-[#e4e4e7] font-semibold">{renderTextWithCode(parsed.label)}</span>
          {' — '}
          {renderTextWithCode(parsed.body)}
        </p>
      ) : (
        <p className="text-[13px] leading-[1.7] text-[#b0b0c0]">{renderTextWithCode(text)}</p>
      )}
      {fileRefs.length > 0 && onFileClick ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {fileRefs.map(f => (
            <button
              key={f}
              className="inline-flex items-center gap-1 text-[11px] text-[#6e6e8a] hover:text-[#d1d1d6] font-mono transition-colors cursor-pointer"
              onClick={() => onFileClick(f)}
            >
              <span className="material-symbols-outlined text-[13px]">description</span>
              {f}
            </button>
          ))}
        </div>
      ) : null}
      {hasRefs ? (
        <div className="mt-2 flex flex-col gap-2">
          {refs.map((ref, ri) => (
            <CodeRefBlock
              key={ri}
              ref_={ref}
              patch={fileDiffs.get(ref.file) || ''}
              expanded={expanded}
              showDiff={showDiff}
              onToggleExpand={() => setExpanded(e => !e)}
              onToggleDiff={() => setShowDiff(d => !d)}
              onFileClick={onFileClick ? () => onFileClick(ref.file) : undefined}
            />
          ))}
        </div>
      ) : null}
      </div>
    </div>
  );
}

/** Renders a single code reference block with code/diff toggle. */
function CodeRefBlock({ ref_, patch, expanded, showDiff, onToggleExpand, onToggleDiff, onFileClick }: {
  ref_: { file: string; startLine: number; endLine: number };
  patch: string;
  expanded: boolean;
  showDiff: boolean;
  onToggleExpand: () => void;
  onToggleDiff: () => void;
  onFileClick?: () => void;
}) {
  const diffLines = useMemo(() => extractLineRange(patch, ref_.file, ref_.startLine, ref_.endLine), [patch, ref_.file, ref_.startLine, ref_.endLine]);
  const contentLines = useMemo(() => diffLines.filter(l => l.type !== 'header'), [diffLines]);

  // Code view: show resulting code (add + context lines, skip removals), with per-line highlighting
  const codeLines = useMemo(() => contentLines.filter(l => l.type !== 'remove'), [contentLines]);
  const highlightedLines = useMemo(() => codeLines.map(l => highlight(l.content)), [codeLines]);

  if (contentLines.length === 0) return null;

  return (
    <div className="bg-[#1a1a22] rounded-md overflow-hidden text-[11px] font-mono">
      <div className="flex items-center justify-between border-b border-[#2a2a35]">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-[#6e6e8a] hover:text-[#d1d1d6] transition-colors cursor-pointer text-left"
          onClick={onToggleExpand}
        >
          <span className={`material-symbols-outlined text-[12px] transition-transform ${expanded ? 'rotate-90' : ''}`}>
            arrow_right
          </span>
          {ref_.file}:{ref_.startLine}-{ref_.endLine}
        </button>
        {expanded ? (
          <button
            className={`flex items-center gap-1 px-2 py-1 mr-1.5 rounded text-[10px] transition-colors cursor-pointer ${showDiff ? 'text-[#d1d1d6] bg-[#2a2a35]' : 'text-[#52526a] hover:text-[#6e6e8a]'}`}
            onClick={onToggleDiff}
            title={showDiff ? 'Show code' : 'Show diff'}
          >
            <span className="material-symbols-outlined text-[12px]">difference</span>
          </button>
        ) : null}
      </div>
      {expanded ? (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-fit">
              {showDiff ? (
                contentLines.map((line, li) => (
                  <div
                    key={li}
                    className={`flex ${
                      line.type === 'add' ? 'text-green-400 bg-[#1a2e1a]' :
                      line.type === 'remove' ? 'text-red-400 bg-[#2e1a1a]' :
                      'text-[#6e6e8a]'
                    }`}
                  >
                    <span className="w-[4ch] text-right text-[#3f3f4e] select-none pr-2 shrink-0">
                      {line.newLineNumber ?? line.oldLineNumber ?? ''}
                    </span>
                    <span className="w-[2ch] shrink-0 select-none">
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                    </span>
                    <span className="whitespace-pre">{line.content}</span>
                  </div>
                ))
              ) : (
                codeLines.map((line, li) => (
                  <div key={li} className="flex">
                    <span className="w-[4ch] text-right text-[#3f3f4e] select-none pr-2 shrink-0">
                      {line.newLineNumber ?? ''}
                    </span>
                    <span className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlightedLines[li] }} />
                  </div>
                ))
              )}
            </div>
          </div>
          {onFileClick ? (
            <button
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-[#6e6e8a] hover:text-[#d1d1d6] transition-colors border-t border-[#2a2a35]"
              onClick={onFileClick}
            >
              View full diff
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Extracts unique file-path references from backtick-wrapped segments. */
function extractFileRefs(text: string): string[] {
  const parts = text.split(/(`[^`]+`)/g);
  const refs: string[] = [];
  for (const part of parts) {
    if (part.startsWith('`') && part.endsWith('`')) {
      const inner = part.slice(1, -1);
      if (FILE_PATH_RE.test(inner) && !refs.includes(inner)) {
        refs.push(inner);
      }
    }
  }
  return refs;
}

export interface KeyFile {
  path: string;
  additions: number;
  deletions: number;
  description: string;
}

export interface AnalysisPaneProps {
  toneName: string;
  modelName?: string;
  versions?: Record<string, VersionEntry>;
  versionCount?: number;
  onVersionSelect?: (tone: string, model: string) => void;
  onRegenerate?: () => void;
  regenerateLabel?: string;
  totalFiles?: number;
  totalAdditions?: number;
  totalDeletions?: number;
  totalActivities?: number;
  duration?: string;
  narrative?: string;
  patterns?: string[];
  highlights?: string[];
  risks?: string[];
  nextSteps?: string[];
  keyFiles?: KeyFile[];
  fileTree?: FileTreeNode[];
  onFileClick?: (filePath: string) => void;
  onGenerate?: () => void;
  generating?: boolean;
  sessionGoal?: string;
  intents?: Intent[];
  intentDescriptions?: IntentDescription[];
  agentTrace?: AgentTrace;
  verdict?: string;
  onIntentClick?: (intentIndex: number) => void;
  fileDiffs?: Map<string, string>;
  codeRefs?: CodeRefMap;
}

export function AnalysisPane({
  toneName,
  modelName,
  versions,
  versionCount,
  onVersionSelect,
  onRegenerate,
  regenerateLabel,
  totalFiles = 0,
  totalAdditions = 0,
  totalDeletions = 0,
  totalActivities = 0,
  duration,
  narrative,
  patterns = [],
  highlights = [],
  risks = [],
  nextSteps = [],
  keyFiles = [],
  fileTree = [],
  onFileClick,
  onGenerate,
  generating,
  sessionGoal,
  intents = [],
  intentDescriptions = [],
  agentTrace,
  verdict,
  onIntentClick,
  fileDiffs,
  codeRefs,
}: AnalysisPaneProps) {
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const versionMenuRef = useRef<HTMLDivElement>(null);

  // Close version menu on outside click — same pattern as ReadingPane
  useEffect(() => {
    if (!showVersionMenu) return;
    function handleClick(e: MouseEvent) {
      if (versionMenuRef.current && !versionMenuRef.current.contains(e.target as Node)) {
        setShowVersionMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showVersionMenu]);

  const hasContent = narrative || patterns.length > 0 || highlights.length > 0 || risks.length > 0 || nextSteps.length > 0 || keyFiles.length > 0 || intents.length > 0 || verdict;

  // Empty state — show Generate button or streaming progress
  if (!hasContent) {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-[40px] flex flex-col gap-8 max-w-[640px]">
          {generating ? (
            <p className="text-[15px] leading-relaxed text-[#72728a] italic">
              Generating session analysis... This may take 15-30 seconds.
            </p>
          ) : onGenerate ? (
            <>
              <p className="text-[15px] leading-relaxed text-[#72728a]">
                Generate a session-level analysis across all activities.
              </p>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#fbfbfe]/20 bg-transparent text-[#fbfbfe] hover:bg-[#fbfbfe] hover:text-[#16161a] transition-all text-[13px] font-semibold w-fit"
                onClick={onGenerate}
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                Generate Analysis
              </button>
            </>
          ) : (
            <p className="text-[15px] leading-relaxed text-[#72728a] italic">
              No session data available.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
      <div className="flex flex-col max-w-[600px]">
        {/* Badge row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex gap-2 items-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[#16161a] text-[10px] font-bold tracking-widest bg-[#fbfbfe] uppercase">
              {toneName}
            </span>
            {modelName ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[#72728a] text-[10px] font-bold tracking-widest border border-[#2a2a35] uppercase">
                {modelName}
              </span>
            ) : null}
            {/* Version switcher dropdown */}
            {versionCount && versionCount > 1 && versions && onVersionSelect ? (
              <div className="relative" ref={versionMenuRef}>
                <button
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[#72728a] text-[10px] font-medium border border-[#2a2a35] hover:border-[#fbfbfe]/30 hover:text-[#a0a0b0] transition-all cursor-pointer"
                  onClick={() => setShowVersionMenu(v => !v)}
                >
                  <span className="material-symbols-outlined text-[12px]">history</span>
                  {versionCount} versions
                  <span className="material-symbols-outlined text-[10px]">
                    {showVersionMenu ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {showVersionMenu ? (
                  <div className="absolute top-full left-0 mt-1.5 w-56 bg-[#1e1e24] border border-[#2a2a35] rounded-lg shadow-xl py-1 z-20">
                    {Object.entries(versions).map(([key, v]) => {
                      const isActive = v.tone.toLowerCase() === toneName.toLowerCase() &&
                        v.model === (MODELS.find(m => m.name === modelName)?.id || '');
                      const friendlyModel = MODELS.find(m => m.id === v.model)?.name || v.model;
                      return (
                        <button
                          key={key}
                          className={`w-full text-left px-3 py-2 text-[12px] flex items-center justify-between transition-colors ${
                            isActive
                              ? 'text-[#fbfbfe] bg-[#2a2a35]'
                              : 'text-[#72728a] hover:text-[#fbfbfe] hover:bg-[#2a2a35]'
                          }`}
                          onClick={() => {
                            onVersionSelect(v.tone, v.model);
                            setShowVersionMenu(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <span className="material-symbols-outlined text-[14px] text-primary">check</span>
                            ) : (
                              <span className="w-[14px]" />
                            )}
                            <span className="capitalize font-medium">{v.tone}</span>
                          </div>
                          <span className="text-[10px] opacity-60">{friendlyModel}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          {onRegenerate ? (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#fbfbfe]/20 bg-transparent text-[#fbfbfe] hover:bg-[#fbfbfe] hover:text-[#16161a] transition-all text-[10px] font-bold tracking-widest uppercase ml-auto"
              onClick={onRegenerate}
            >
              <span className="material-symbols-outlined text-[14px]">{regenerateLabel === 'Switch' ? 'swap_horiz' : 'refresh'}</span>
              {regenerateLabel || 'Regenerate'}
            </button>
          ) : null}
        </div>

        {/* Verdict — top of the report */}
        {verdict ? (
          <div className="mb-6 bg-[#1e1e24] border border-[#2a2a35] rounded-lg px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="material-symbols-outlined text-[14px] text-[#72728a]">verified</span>
              <span className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase">Verdict</span>
            </div>
            <p className="text-[14px] text-[#e4e4e7] leading-[1.6] font-medium">{renderTextWithCode(verdict)}</p>
          </div>
        ) : null}

        {/* Stats strip */}
        {totalFiles > 0 ? (
          <div className="font-mono text-[11px] text-[#72728a] py-2.5 border-y border-[#2a2a35] flex items-center gap-2.5 mb-6">
            <span>{totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>
            <span>&middot;</span>
            <span>
              <span className="text-[#4ade80]">+{totalAdditions}</span>
              {' / '}
              <span className="text-[#f87171]">-{totalDeletions}</span>
              {' lines'}
            </span>
            {totalActivities > 0 ? (
              <>
                <span>&middot;</span>
                <span>{totalActivities} activit{totalActivities !== 1 ? 'ies' : 'y'}</span>
              </>
            ) : null}
            {duration ? (
              <>
                <span>&middot;</span>
                <span>{duration}</span>
              </>
            ) : null}
          </div>
        ) : null}

        {/* Session Goal */}
        {sessionGoal ? (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-2">Session Goal</h3>
            <p className="text-[12px] text-[#8e8ea0] leading-[1.6]">{sessionGoal}</p>
          </div>
        ) : null}

        {/* Narrative — lead sentence + body paragraphs */}
        {narrative ? (() => {
          let lead: string;
          let bodyParagraphs: string[];

          const firstBreak = narrative.indexOf('\n\n');
          if (firstBreak > 0) {
            lead = narrative.slice(0, firstBreak);
            bodyParagraphs = narrative.slice(firstBreak + 2).split('\n\n').filter(Boolean);
          } else {
            // Fallback: split after first sentence
            const sentenceEnd = narrative.search(/\.\s/);
            if (sentenceEnd > 0) {
              lead = narrative.slice(0, sentenceEnd + 1);
              bodyParagraphs = [narrative.slice(sentenceEnd + 2)].filter(Boolean);
            } else {
              lead = narrative;
              bodyParagraphs = [];
            }
          }

          return (
            <div className="mb-6">
              <ReactMarkdown
                disallowedElements={['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'blockquote', 'pre']}
                unwrapDisallowed={true}
                components={{
                  p: ({ node, ...props }) => (
                    <p className="text-[15px] leading-[1.7] text-[#e4e4e7] mb-3" {...props} />
                  ),
                  code: ({ node, ...props }) => (
                    <code className="bg-[#2a2a35] px-1 py-0.5 rounded text-[13px] font-mono text-[#c0c0d0]" {...props} />
                  ),
                }}
              >
                {lead}
              </ReactMarkdown>
              {bodyParagraphs.map((para, i) => (
                <ReactMarkdown
                  key={i}
                  disallowedElements={['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'blockquote', 'pre']}
                  unwrapDisallowed={true}
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="text-[13px] leading-[1.7] text-[#a0a0b0] mb-3" {...props} />
                    ),
                    code: ({ node, ...props }) => (
                      <code className="bg-[#2a2a35] px-1 py-0.5 rounded text-[12px] font-mono text-[#c0c0d0]" {...props} />
                    ),
                  }}
                >
                  {para}
                </ReactMarkdown>
              ))}
            </div>
          );
        })() : null}

        {/* Intents */}
        {intents.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-3">Intents</h3>
            <div className="flex flex-col gap-2">
              {intents.map((intent, i) => {
                const desc = intentDescriptions.find(d => d.intentIndex === i);
                return (
                  <IntentCard
                    key={i}
                    title={desc?.title || intent.title}
                    fileCount={intent.files.length}
                    description={desc?.description || intent.whatChanged}
                    onClick={onIntentClick ? () => onIntentClick(i) : undefined}
                  />
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Patterns — scannable list with bold labels */}
        {patterns.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-1">Patterns</h3>
            <div className="flex flex-col">
              {patterns.map((p, i) => (
                <LabeledItem key={i} text={p} index={i} sectionKey="patterns" onFileClick={onFileClick} fileDiffs={fileDiffs} codeRefs={codeRefs} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Highlights */}
        {highlights.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-1">Highlights</h3>
            <div className="flex flex-col">
              {highlights.map((h, i) => (
                <LabeledItem key={i} text={h} index={i} sectionKey="keyInsights" onFileClick={onFileClick} fileDiffs={fileDiffs} codeRefs={codeRefs} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Risks */}
        {risks.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-1">Risks</h3>
            <div className="flex flex-col">
              {risks.map((r, i) => (
                <LabeledItem key={i} text={r} index={i} sectionKey="riskAssessments" onFileClick={onFileClick} fileDiffs={fileDiffs} codeRefs={codeRefs} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Agent Assessment */}
        {agentTrace ? (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-1">Agent Assessment</h3>
            <div className="flex flex-col">
              {[
                { label: 'Task Understanding', value: agentTrace.taskUnderstanding },
                { label: 'Plan Quality', value: agentTrace.planQuality },
                { label: 'Execution Fidelity', value: agentTrace.executionFidelity },
                { label: 'Pacing', value: agentTrace.pacing },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3 py-2">
                  <span className="text-[#3f3f4e] mt-[3px] shrink-0 text-[16px] leading-none select-none">&#x25B8;</span>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-[1.7] text-[#b0b0c0]">
                      <span className="text-[#e4e4e7] font-semibold">{label}</span>
                      {' — '}
                      {renderTextWithCode(value)}
                    </p>
                  </div>
                </div>
              ))}
              {agentTrace.decisionPoints.length > 0 ? (
                agentTrace.decisionPoints.map((d, i) => (
                  <div key={`dp-${i}`} className="flex gap-3 py-2">
                    <span className="text-[#3f3f4e] mt-[3px] shrink-0 text-[16px] leading-none select-none">&#x25B8;</span>
                    <div className="min-w-0">
                      <p className="text-[13px] leading-[1.7] text-[#b0b0c0]">
                        <span className="text-[#e4e4e7] font-semibold">Decision</span>
                        {' — '}
                        {renderTextWithCode(d)}
                      </p>
                    </div>
                  </div>
                ))
              ) : null}
              {agentTrace.corrections.length > 0 ? (
                agentTrace.corrections.map((c, i) => (
                  <div key={`cor-${i}`} className="flex gap-3 py-2">
                    <span className="text-[#3f3f4e] mt-[3px] shrink-0 text-[16px] leading-none select-none">&#x25B8;</span>
                    <div className="min-w-0">
                      <p className="text-[13px] leading-[1.7] text-[#b0b0c0]">
                        <span className="text-[#e4e4e7] font-semibold">Correction</span>
                        {' — '}
                        {renderTextWithCode(c)}
                      </p>
                    </div>
                  </div>
                ))
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Next Steps */}
        {nextSteps.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-1">What's Next</h3>
            <div className="flex flex-col">
              {nextSteps.map((ns, i) => (
                <LabeledItem key={i} text={ns} index={i} sectionKey="nextSteps" onFileClick={onFileClick} fileDiffs={fileDiffs} codeRefs={codeRefs} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Key Files — clickable cards with drill-in */}
        {keyFiles.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-3">Key Files</h3>
            <div className="flex flex-col gap-2">
              {keyFiles.map(f => (
                <KeyFileCard
                  key={f.path}
                  path={f.path}
                  additions={f.additions}
                  deletions={f.deletions}
                  description={f.description}
                  onClick={onFileClick ? () => onFileClick(f.path) : undefined}
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* All Files — collapsible file tree */}
        {fileTree.length > 0 ? (
          <div className="mb-6">
            <button
              className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-3 hover:text-[#a0a0b0] transition-colors"
              onClick={() => setShowAllFiles(v => !v)}
            >
              <span className={`material-symbols-outlined text-[14px] transition-transform ${showAllFiles ? 'rotate-90' : ''}`}>
                arrow_right
              </span>
              All Files ({totalFiles})
            </button>
            {showAllFiles ? (
              <FileTree nodes={fileTree} />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
