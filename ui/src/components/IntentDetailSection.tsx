import { renderTextWithCode } from '../lib/markdown-utils';

export interface IntentDetailSectionProps {
  title: string;
  content: string;
}

export function IntentDetailSection({ title, content }: IntentDetailSectionProps) {
  if (!content) return null;

  return (
    <div>
      <h3 className="text-[10px] font-bold tracking-widest text-[#72728a] uppercase mb-2">
        {title}
      </h3>
      <p className="text-[13px] text-[#b0b0c0] leading-[1.7]">
        {renderTextWithCode(content)}
      </p>
    </div>
  );
}
