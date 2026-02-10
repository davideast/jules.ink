interface TradeoffGridProps {
  benefits: string[];
  costs: string[];
}

export function TradeoffGrid({ benefits, costs }: TradeoffGridProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="border-l-2 border-green-400 pl-4 py-1">
        <h3 className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase mb-3">Benefits</h3>
        <ul className="text-[13px] text-[#d0d0d5] space-y-2 list-disc list-outside ml-3">
          {benefits.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
      <div className="border-l-2 border-yellow-500 pl-4 py-1">
        <h3 className="text-[11px] font-bold tracking-widest text-[#72728a] uppercase mb-3">Costs</h3>
        <ul className="text-[13px] text-[#d0d0d5] space-y-2 list-disc list-outside ml-3">
          {costs.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
