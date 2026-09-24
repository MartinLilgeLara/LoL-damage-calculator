import type { ComputedUnitStats } from '../../types/game';
import { calculateEffectiveArmor } from '../../engine/mitigation';

interface AutoAttackCardProps {
    attackerStats: ComputedUnitStats;
    targetStats: ComputedUnitStats;
    attackWindupRemaining: number;
    attackCooldownRemaining: number;
    onAttack: () => void;
}

export function AutoAttackCard({
                                   attackerStats,
                                   targetStats,
                                   attackWindupRemaining,
                                   attackCooldownRemaining,
                                   onAttack,
                               }: AutoAttackCardProps) {
    const isWindupActive = attackWindupRemaining > 0;
    const isRecovering = attackCooldownRemaining > 0 && !isWindupActive;
    const isDisabled = isWindupActive || attackCooldownRemaining > 0;

    // Cálculo da armadura efetiva e redução percentual exata
    const effectiveArmor = calculateEffectiveArmor(attackerStats, targetStats);
    const damageMultiplier = effectiveArmor >= 0
        ? 100 / (100 + effectiveArmor)
        : 2 - 100 / (100 - effectiveArmor);

    const normalEffectiveDmg = Math.round(attackerStats.totalAd * damageMultiplier);
    const critRawDmg = attackerStats.totalAd * (attackerStats.critDamage / 100);
    const critEffectiveDmg = Math.round(critRawDmg * damageMultiplier);

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        AA
                    </span>
                    <strong className="text-base text-slate-100">Basic Attack</strong>

                    {isWindupActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-950 text-amber-400 border border-amber-800 animate-pulse">
                            Windup ({attackWindupRemaining.toFixed(2)}s)
                        </span>
                    )}

                    {isRecovering && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-950 text-slate-400 border border-slate-800">
                            Recovering ({attackCooldownRemaining.toFixed(2)}s)
                        </span>
                    )}
                </div>

                <p className="text-xs text-slate-400">
                    Deals <span className="text-emerald-400 font-bold font-mono">{normalEffectiveDmg}</span> effective damage{' '}
                    <span className="text-slate-500 font-mono">(Raw: {attackerStats.totalAd} | Armor: {effectiveArmor})</span>.
                    {attackerStats.critChance > 0 && (
                        <span className="text-red-400 ml-1">
                            Crit: <span className="font-bold">{critEffectiveDmg}</span> ({attackerStats.critDamage}%)
                        </span>
                    )}
                </p>
            </div>

            <button
                type="button"
                disabled={isDisabled}
                onClick={onAttack}
                className={`px-5 py-2 font-bold text-xs rounded-lg transition-all cursor-pointer ${
                    isWindupActive
                        ? 'bg-amber-600 text-slate-950 animate-pulse'
                        : isDisabled
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 pointer-events-none'
                            : 'bg-orange-600 hover:bg-orange-500 active:scale-95 text-slate-950 shadow-md shadow-orange-600/20'
                }`}
            >
                {isWindupActive
                    ? `Swinging (${attackWindupRemaining.toFixed(2)}s)...`
                    : isDisabled
                        ? `${attackCooldownRemaining.toFixed(2)}s`
                        : '⚔️ Attack'}
            </button>
        </div>
    );
}