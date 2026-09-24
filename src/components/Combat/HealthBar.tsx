interface HealthBarProps {
    currentHp: number;
    maxHp: number;
    onReset: () => void;
}

export function HealthBar({ currentHp, maxHp, onReset }: HealthBarProps) {
    const safeCurrentHp = Math.max(0, Math.min(currentHp, maxHp));
    const hpPercent = maxHp > 0 ? (safeCurrentHp / maxHp) * 100 : 0;
    const thousandMarkersCount = Math.floor(maxHp / 1000);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 w-full text-left">
            <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Target Health</span>
                <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                        {Math.ceil(safeCurrentHp)}{' '}
                        <span className="text-slate-500 text-xs">/ {maxHp}</span>
                    </span>
                    <button
                        type="button"
                        onClick={onReset}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 rounded text-[11px] font-medium border border-slate-700 transition-all cursor-pointer"
                    >
                        Reset HP
                    </button>
                </div>
            </div>

            {/* Trilho de fundo escuro */}
            <div className="relative w-full h-6 bg-slate-950 rounded border border-slate-800 overflow-hidden flex items-center">
                {/* Preenchimento dinâmico */}
                <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${hpPercent}%` }}
                />

                {/* Marcadores a cada 1000 de vida */}
                {Array.from({ length: thousandMarkersCount }).map((_, i) => {
                    const markerPos = (((i + 1) * 1000) / maxHp) * 100;
                    return (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 w-[2px] bg-black/70 pointer-events-none"
                            style={{ left: `${markerPos}%` }}
                        />
                    );
                })}
            </div>
        </div>
    );
}