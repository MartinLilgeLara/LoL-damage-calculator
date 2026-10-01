import type { SkillStage, ComputedUnitStats } from '../../types/game';
import { calculateEffectiveDamage } from '../../engine/calculator';

interface SkillStageCardProps {
    stage: SkillStage;
    rank: number;
    attackerStats: ComputedUnitStats;
    targetStats: ComputedUnitStats;
    targetCurrentHp?: number;
}

export function SkillStageCard({
    stage,
    rank,
    attackerStats,
    targetStats,
    targetCurrentHp,
}: SkillStageCardProps) {
    const result = calculateEffectiveDamage(stage, rank, attackerStats, targetStats, targetCurrentHp);

    const damageColor =
        result.damageType === 'magic'
            ? 'text-cyan-300'
            : result.damageType === 'physical'
                ? 'text-orange-300'
                : 'text-white';

    const badgeBg =
        result.damageType === 'magic'
            ? 'bg-cyan-950/60 border-cyan-700/50 text-cyan-400'
            : result.damageType === 'physical'
                ? 'bg-orange-950/60 border-orange-700/50 text-orange-400'
                : 'bg-slate-800/60 border-slate-600/50 text-white';

    const percentLost = ((result.effectiveDamage / targetStats.totalHp) * 100).toFixed(1);
    const isDoT = stage.isOverTime === true;

    return (
        <div className="flex items-center justify-between gap-3 py-1.5 px-2 rounded bg-black/20 border border-white/5">
            <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeBg}`}>
                    {isDoT ? 'DoT' : result.damageType}
                </span>
                <span className="text-xs text-slate-400 truncate">{stage.name}</span>
            </div>
            <div className="text-right shrink-0">
                <span className={`text-sm font-bold font-mono ${damageColor}`}>
                    {result.effectiveDamage}
                </span>
                <span className="text-[10px] text-slate-500 ml-1">
                    ({percentLost}% HP)
                </span>
            </div>
        </div>
    );
}