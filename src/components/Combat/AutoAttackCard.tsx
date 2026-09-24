import type { ComputedUnitStats } from '../../types/game';
import { calculateEffectiveArmor } from '../../engine/mitigation';
import type { SpellbladeBuff } from '../../engine/autoAttack';

interface AutoAttackCardProps {
    attackerStats: ComputedUnitStats;
    targetStats: ComputedUnitStats;
    attackWindupRemaining: number;
    attackCooldownRemaining: number;
    spellblade?: SpellbladeBuff;
    onAttack: () => void;
}

export function AutoAttackCard({
                                   attackerStats,
                                   targetStats,
                                   attackWindupRemaining,
                                   attackCooldownRemaining,
                                   spellblade,
                                   onAttack,
                               }: AutoAttackCardProps) {
    const isWindupActive = attackWindupRemaining > 0;
    const isRecovering = attackCooldownRemaining > 0 && !isWindupActive;
    const isDisabled = isWindupActive || attackCooldownRemaining > 0;

    const hasSpellbladeActive = Boolean(spellblade?.active && spellblade.extraDamage > 0);

    // Cálculo da armadura efetiva e redução percentual
    const effectiveArmor = calculateEffectiveArmor(attackerStats, targetStats);
    const damageMultiplier =
        effectiveArmor >= 0
            ? 100 / (100 + effectiveArmor)
            : 2 - 100 / (100 - effectiveArmor);

    const normalEffectiveDmg = Math.round(attackerStats.totalAd * damageMultiplier);
    const critRawDmg = attackerStats.totalAd * (attackerStats.critDamage / 100);
    const critEffectiveDmg = Math.round(critRawDmg * damageMultiplier);

    return (
        <div
            className={`bg-slate-900 border rounded-xl p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-left transition-all ${
                hasSpellbladeActive
                    ? 'border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/50'
                    : 'border-slate-800'
            }`}
        >
            <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                        AA
                    </span>
                    <strong className="text-base text-slate-100">Basic Attack</strong>

                    {/* Sinalizador Visual de Spellblade (Sheen / Lich Bane) */}
                    {hasSpellbladeActive && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>
                                {spellblade?.sourceItemName} ON (+{spellblade?.extraDamage} raw):{' '}
                                {spellblade?.durationRemaining.toFixed(1)}s
                            </span>
                        </div>
                    )}

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
                    {hasSpellbladeActive && (
                        <span className="text-amber-400 ml-2 font-medium">
                            ⚡ Next strike is empowered!
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
                            : hasSpellbladeActive
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/60 animate-bounce'
                                : 'bg-orange-600 hover:bg-orange-500 active:scale-95 text-slate-950 shadow-md shadow-orange-600/20'
                }`}
            >
                {isWindupActive
                    ? `Swinging (${attackWindupRemaining.toFixed(2)}s)...`
                    : isDisabled
                        ? `${attackCooldownRemaining.toFixed(2)}s`
                        : hasSpellbladeActive
                            ? '⚡ Sheen Attack'
                            : '⚔️ Attack'}
            </button>
        </div>
    );
}