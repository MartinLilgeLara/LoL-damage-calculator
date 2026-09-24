import type { DamageType } from '../../types/game';

export interface CombatLogEntry {
    id: string;
    timestamp: string;
    source: string;
    rawDamage: number;
    effectiveDamage: number;
    damageType: DamageType;
    isCritical?: boolean;
}

interface CombatLogProps {
    entries: CombatLogEntry[];
    onClear: () => void;
}

export function CombatLog({ entries, onClear }: CombatLogProps) {
    const getBadgeStyle = (type: DamageType) => {
        switch (type) {
            case 'magic':
                return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/80';
            case 'true':
                return 'text-white bg-slate-800 border-slate-600';
            case 'physical':
            default:
                return 'text-orange-400 bg-orange-950/40 border-orange-800/80';
        }
    };

    const totalDamageDealt = entries.reduce((acc, curr) => acc + curr.effectiveDamage, 0);

    return (
        <div className="max-w-6xl w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-left space-y-2">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">
                        📜 Combat Log
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                        ({entries.length} hits | Total:{' '}
                        <strong className="text-amber-400 font-bold">{Math.round(totalDamageDealt)}</strong>)
                    </span>
                </div>

                <button
                    type="button"
                    onClick={onClear}
                    className="px-2 py-0.5 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 rounded cursor-pointer transition active:scale-95"
                >
                    Clear Log
                </button>
            </div>

            {/* Caixa com scroll para os registros */}
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-xs">
                {entries.length === 0 ? (
                    <div className="text-slate-600 text-center py-3 text-[11px] font-sans">
                        Nenhum dano registrado ainda. Desfira um ataque básico ou conjure uma habilidade.
                    </div>
                ) : (
                    entries.map((log) => (
                        <div
                            key={log.id}
                            className="flex justify-between items-center bg-slate-950/70 border border-slate-800/70 px-2.5 py-1 rounded text-[11px]"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                                <span className="text-slate-200 font-semibold">{log.source}</span>
                                {log.isCritical && (
                                    <span className="text-[9px] bg-red-950 text-red-400 border border-red-800 px-1 rounded font-bold uppercase">
                                        CRIT
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-3">
                                <span className="text-slate-500 text-[10px]">
                                    Raw: <span className="text-slate-400">{log.rawDamage}</span>
                                </span>
                                <span className="text-emerald-400 font-bold">
                                    -{log.effectiveDamage}
                                </span>
                                <span
                                    className={`px-1.5 py-0.2 rounded border text-[9px] uppercase font-bold ${getBadgeStyle(
                                        log.damageType
                                    )}`}
                                >
                                    {log.damageType}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}