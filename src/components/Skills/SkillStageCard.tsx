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

    const badgeColor =
        result.damageType === 'magic'
            ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800'
            : result.damageType === 'physical'
                ? 'text-orange-400 bg-orange-950/40 border-orange-800'
                : 'text-white bg-slate-800 border-slate-600';

    const percentLost = ((result.effectiveDamage / targetStats.totalHp) * 100).toFixed(1);

    return (
        <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-slate-300">{stage.name}</span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold ${badgeColor}`}>
          {result.damageType}
        </span>
            </div>

            <div className="flex justify-between items-baseline pt-1">
        <span className="text-xs text-slate-500">
          Raw: <span className="text-slate-300 font-mono">{result.rawDamage}</span>
        </span>
                <div className="text-right">
                    <span className="text-xs text-slate-400 mr-1">Effective:</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
            {result.effectiveDamage}
          </span>
                    <span className="text-[10px] text-slate-500 block">
            (~{percentLost}% of target's HP)
          </span>
                </div>
            </div>
        </div>
    );
}