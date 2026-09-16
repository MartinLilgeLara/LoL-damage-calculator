import type { Skill, ComputedUnitStats } from '../../types/game';
import { SkillStageCard } from './SkillStageCard';

interface SkillCardProps {
    skill: Skill;
    currentRank: number;
    attackerStats: ComputedUnitStats;
    targetStats: ComputedUnitStats;
    onRankChange: (rank: number) => void;
}

export function SkillCard({
                              skill,
                              currentRank,
                              attackerStats,
                              targetStats,
                              onRankChange,
                          }: SkillCardProps) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
                <div>
          <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded mr-2 border border-amber-500/30">
            {skill.key}
          </span>
                    <strong className="text-base text-slate-100">{skill.name}</strong>
                </div>

                <div className="flex gap-1">
                    {Array.from({ length: skill.maxRank }, (_, i) => i + 1).map((rank) => (
                        <button
                            key={rank}
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
                {skill.stages.map((stage) => (
                    <SkillStageCard
                        key={stage.id}
                        stage={stage}
                        rank={currentRank}
                        attackerStats={attackerStats}
                        targetStats={targetStats}
                    />
                ))}
            </div>
        </div>
    );
}