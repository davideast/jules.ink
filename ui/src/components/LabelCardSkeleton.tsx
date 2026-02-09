export function LabelCardSkeleton() {
  return (
    <div
      className="label-card flex flex-col justify-between text-black shrink-0 overflow-hidden opacity-60"
      style={{
        width: 340,
        aspectRatio: '2/3',
        backgroundColor: '#ffffff',
        boxShadow:
          '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        borderRadius: 2,
        border: '1px solid #e5e5e5',
        position: 'relative',
      }}
    >
      <div className="w-full h-full flex flex-col select-none">
        {/* Header: two short bars for repo + sessionId */}
        <div className="flex justify-between items-baseline px-[18px] pt-[14px] gap-2">
          <div className="skeleton-pulse h-[10px] w-[100px] bg-black/10 rounded" />
          <div className="skeleton-pulse h-[10px] w-[60px] bg-black/10 rounded" />
        </div>

        {/* Logo placeholder */}
        <div className="px-[18px] pt-[16px]">
          <div className="skeleton-pulse h-[30px] w-[28px] bg-black/10 rounded" />
        </div>

        {/* Summary lines */}
        <div className="flex-1 px-[18px] pt-[8px] flex flex-col gap-[10px]">
          <div className="skeleton-pulse h-[16px] w-full bg-black/10 rounded" />
          <div className="skeleton-pulse h-[16px] w-[85%] bg-black/10 rounded" />
          <div className="skeleton-pulse h-[16px] w-[70%] bg-black/10 rounded" />
          <div className="skeleton-pulse h-[16px] w-[90%] bg-black/10 rounded" />
        </div>

        {/* File stats */}
        <div className="px-[18px] pb-1 flex flex-col gap-[4px]">
          <div className="flex justify-between">
            <div className="skeleton-pulse h-[10px] w-[120px] bg-black/10 rounded" />
            <div className="skeleton-pulse h-[10px] w-[50px] bg-black/10 rounded" />
          </div>
          <div className="flex justify-between">
            <div className="skeleton-pulse h-[10px] w-[140px] bg-black/10 rounded" />
            <div className="skeleton-pulse h-[10px] w-[50px] bg-black/10 rounded" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-[18px] pb-[12px] text-right">
          <div className="skeleton-pulse h-[8px] w-[80px] bg-black/10 rounded ml-auto" />
        </div>
      </div>
    </div>
  );
}
