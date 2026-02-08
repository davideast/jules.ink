import { memo } from 'react';

export interface LabelCardProps {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export const LabelCard = memo(function LabelCard({
  selected = false,
  onClick,
  children,
}: LabelCardProps) {
  return (
    <div
      className={[
        'label-card p-6 flex flex-col justify-between text-black shrink-0',
        selected ? '' : 'opacity-80 hover:opacity-100 transition-opacity',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      style={{
        width: 340,
        aspectRatio: '2/3',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        borderRadius: 2,
        border: '1px solid #e5e5e5',
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
});
