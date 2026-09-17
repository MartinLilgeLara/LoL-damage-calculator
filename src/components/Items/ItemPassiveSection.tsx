import type { Item, ComputedUnitStats } from '../../types/game';
import { calculateItemPassiveDamage } from '../../engine/ItemsCalculator.ts';

interface ItemPassivesSectionProps {
    items: (Item | null)[];
    attackerStats: ComputedUnitStats;
    targetStats: ComputedUnitStats;
}

export function ItemPassivesSection({
                                        items,
                                        attackerStats,
                                        targetStats,
                                    }: ItemPassivesSectionProps) {
    // Coleta todas as passivas de dano dos itens equipados (removendo duplicadas uniques)
    const seenUniqueIds = new Set<string>();
    const passiveDamages = items.flatMap((item) => {
        if (!item?.passives) return [];

        return item.passives.flatMap((passive) => {
            if (passive.category === 'stat_multiplier') return [];
            if (passive.unique && seenUniqueIds.has(passive.id)) return [];
            if (passive.unique) seenUniqueIds.add(passive.id);

            const calculated = calculateItemPassiveDamage(passive, item.name, attackerStats, targetStats);
            return calculated ? [calculated] : [];
        });
    });

    if (passiveDamages.length === 0) {
        return (
            <section className="max-w-6xl w-full bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 text-center text-slate-500 text-xs">
                Nenhum item com passiva de dano equipado no atacante.
            </section>
        );
    }

    return (
        <section className="max-w-6xl w-full bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-800 pb-2">
                <h3 className="text-lg font-bold text-amber-400">Passivas de Dano de Itens</h3>
                <p className="text-xs text-slate-400">
                    Dano projetado contra as resistências atuais do alvo.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {passiveDamages.map((dmg) => {
                    const badgeColor =
                        dmg.damageType === 'magic'
                            ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800'
                            : dmg.damageType === 'physical'
                                ? 'text-orange-400 bg-orange-950/40 border-orange-800'
                                : 'text-white bg-slate-800 border-slate-600';

                    const percentLost = ((dmg.effectiveDamage / targetStats.totalHp) * 100).toFixed(1);

                    return (
                        <div
                            key={dmg.passiveId}
                            className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2"
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div>
                  <span className="text-[10px] text-amber-400/80 uppercase font-mono block">
                    {dmg.itemName}
                  </span>
                                    <strong className="text-xs text-slate-200">{dmg.passiveName}</strong>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded border text-[9px] uppercase font-bold ${badgeColor}`}>
                  {dmg.damageType}
                </span>
                            </div>

                            <div className="text-[11px] text-slate-400">{dmg.description}</div>

                            <div className="flex justify-between items-baseline pt-1 border-t border-slate-900">
                <span className="text-xs text-slate-500">
                  Bruto: <span className="text-slate-300 font-mono">{dmg.rawDamage}</span>
                </span>
                                <div className="text-right">
                                    <span className="text-xs text-slate-400 mr-1">Efetivo:</span>
                                    <span className="text-lg font-bold font-mono text-emerald-400">
                    {dmg.effectiveDamage}
                  </span>
                                    <span className="text-[10px] text-slate-500 block">
                    (~{percentLost}% da vida)
                  </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}