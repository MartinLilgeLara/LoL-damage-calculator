import type { ResourceType } from '../../types/game';

interface ResourceBarProps {
    resourceType: ResourceType;
    currentValue: number;
    maxValue: number;
    onChange: (val: number) => void;
}

export function ResourceBar({ resourceType, currentValue, maxValue, onChange }: ResourceBarProps) {
    if (resourceType === 'none' || maxValue <= 0) return null;

    const isFury = resourceType === 'fury';
    const percent = Math.min(100, Math.max(0, (currentValue / maxValue) * 100));

    const barColor = isFury
        ? currentValue >= 50
            ? 'from-red-600 to-amber-500' // Fúria empoderada
            : 'from-amber-700 to-amber-600'
        : 'from-blue-600 to-cyan-500'; // Mana

    return (
        <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg space-y-2 mt-2">
            <div className="flex justify-between items-center text-xs">
        <span className="font-semibold text-slate-300 capitalize">
          {isFury ? 'Fury (Fúria)' : 'Mana'}
        </span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className={isFury && currentValue >= 50 ? 'font-bold text-amber-400' : 'text-slate-200'}>
            {Math.round(currentValue)}
          </span>
                    <span className="text-slate-500">/ {maxValue}</span>
                </div>
            </div>

            {/* Barra Visual */}
            <div className="relative w-full h-3 bg-slate-900 rounded overflow-hidden border border-slate-800">
                <div
                    className={`h-full bg-gradient-to-r ${barColor} transition-all duration-150`}
                    style={{ width: `${percent}%` }}
                />
                {/* Marcador de 50 de fúria */}
                {isFury && (
                    <div
                        className="absolute top-0 bottom-0 w-[2px] bg-white/70 pointer-events-none"
                        style={{ left: '50%' }}
                    />
                )}
            </div>

            {/* Controles Rápidos: Slider + Botões de Atalho */}
            <div className="flex items-center gap-2 pt-1">
                <input
                    type="range"
                    min="0"
                    max={maxValue}
                    value={currentValue}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1 bg-slate-800 rounded"
                />

                {isFury ? (
                    <div className="flex gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => onChange(0)}
                            className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                        >
                            0
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(50)}
                            className="px-1.5 py-0.5 text-[10px] bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-bold border border-amber-600/50 rounded"
                        >
                            50
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(100)}
                            className="px-1.5 py-0.5 text-[10px] bg-red-600/30 hover:bg-red-600/50 text-red-300 font-bold border border-red-600/50 rounded"
                        >
                            100
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => onChange(0)}
                            className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                        >
                            0%
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(maxValue)}
                            className="px-1.5 py-0.5 text-[10px] bg-cyan-700 hover:bg-cyan-600 text-slate-950 font-bold rounded"
                        >
                            100%
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}