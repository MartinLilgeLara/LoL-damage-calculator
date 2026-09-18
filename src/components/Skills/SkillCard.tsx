import type { Skill, ComputedUnitStats } from '../../types/game';
import { calculateEffectiveDamage } from '../../engine/calculator';
import { SkillStageCard } from './SkillStageCard';

interface SkillCardProps {
    skill: Skill;
    currentRank: number;
    attackerStats: ComputedUnitStats;
    targetStats: ComputedUnitStats;
    attackerResource: number;
    onRankChange: (rank: number) => void;
    onCast: (damage: number, furyCost?: number) => void;
    targetCurrentHp?: number;
}

export function SkillCard({
                              skill,
                              currentRank,
                              attackerStats,
                              targetStats,
                              attackerResource,
                              targetCurrentHp,
                              onRankChange,
                              onCast,
                          }: SkillCardProps) {
    const isFuryUser = attackerStats.resourceType === 'fury';
    const hasEmpoweredFury = isFuryUser && attackerResource >= 50;
    const hasEmpoweredStages = skill.stages.some((s) => s.isEmpowered === true);
    const activeStages = skill.stages.filter((stage) => {
        if (!hasEmpoweredStages) return true;
        return hasEmpoweredFury ? stage.isEmpowered === true : stage.isEmpowered !== true;
    });

    const handleCastSkill = () => {
        const totalDamage = activeStages.reduce((acc, stage) => {
            const calculated = calculateEffectiveDamage(stage, currentRank, attackerStats, targetStats,targetCurrentHp);
            return acc + calculated.effectiveDamage;
        }, 0);
        const furySpent = hasEmpoweredStages && hasEmpoweredFury ? 50 : 0;
        onCast(totalDamage, furySpent);
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                        {skill.key}
                    </span>
                    <strong className="text-base text-slate-100">{skill.name}</strong>
                    {hasEmpoweredStages && (
                        <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                hasEmpoweredFury
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                        >
              {hasEmpoweredFury ? 'Empowered (50 Fúria)' : 'Normal'}
            </span>
                    )}
                    <button
                        type="button"
                        onClick={handleCastSkill}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-bold text-xs rounded transition-all cursor-pointer shadow-sm ml-1"
                    >
                        Cast
                    </button>
                </div>

                <div className="flex gap-1">
                    {Array.from({ length: skill.maxRank }, (_, i) => i + 1).map((rank) => (
                        <button
                            key={rank}
                            type="button"
                            onClick={() => onRankChange(rank)}
                            className={`w-7 h-7 rounded text-xs font-bold transition ${
                                currentRank === rank
                                    ? 'bg-amber-500 text-slate-950 shadow'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                        >
                            {rank}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {activeStages.map((stage) => (
                    <SkillStageCard
                        key={stage.id}
                        stage={stage}
                        rank={currentRank}
                        attackerStats={attackerStats}
                        targetStats={targetStats}
                        targetCurrentHp={targetCurrentHp}
                    />
                ))}
            </div>
        </div>
    );
}