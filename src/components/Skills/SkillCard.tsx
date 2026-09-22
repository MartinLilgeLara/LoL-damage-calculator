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
    cooldownRemaining?: number;
    // [MUDANÇA 1]: Novas props para suporte genérico a múltiplos casts
    currentCast?: number;
    recastWindowRemaining?: number;
}

export function SkillCard({
                              skill,
                              currentRank,
                              attackerStats,
                              targetStats,
                              attackerResource,
                              targetCurrentHp,
                              cooldownRemaining = 0,
                              // [MUDANÇA 2]: Valores padrão para as novas props
                              currentCast = 1,
                              recastWindowRemaining = 0,
                              onRankChange,
                              onCast,
                          }: SkillCardProps) {
    const isOnCooldown = cooldownRemaining > 0;
    const isFuryUser = attackerStats.resourceType === 'fury';
    const hasEmpoweredFury = isFuryUser && attackerResource >= 50;

    // [MUDANÇA 3]: Filtra primeiro apenas os estágios do cast atual (padrão é castIndex: 1)
    const stagesForCurrentCast = skill.stages.filter(
        (s) => (s.castIndex ?? 1) === currentCast
    );

    // [MUDANÇA 4]: Avalia se o estágio atual tem versão empoderada por fúria
    const hasEmpoweredStages = stagesForCurrentCast.some((s) => s.isEmpowered === true);
    const activeStages = stagesForCurrentCast.filter((stage) => {
        if (!hasEmpoweredStages) return true;
        return hasEmpoweredFury ? stage.isEmpowered === true : stage.isEmpowered !== true;
    });

    const handleCastSkill = () => {
        if (isOnCooldown) return;

        const totalDamage = activeStages.reduce((acc, stage) => {
            const calculated = calculateEffectiveDamage(
                stage,
                currentRank,
                attackerStats,
                targetStats,
                targetCurrentHp
            );
            return acc + calculated.effectiveDamage;
        }, 0);

        // Só consome fúria se o estágio conjurado for empoderado
        const furySpent = hasEmpoweredStages && hasEmpoweredFury ? 50 : 0;
        onCast(totalDamage, furySpent);
    };

    // [MUDANÇA 5]: Variáveis visuais de estado para recast
    const isRecastActive = currentCast > 1;

    // Rótulo dinâmico do botão
    const buttonLabel = isOnCooldown
        ? `${cooldownRemaining.toFixed(1)}s`
        : isRecastActive
            ? `Cast ${currentCast} (${recastWindowRemaining.toFixed(1)}s)`
            : 'Cast';

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                        {skill.key}
                    </span>
                    <strong className="text-base text-slate-100">{skill.name}</strong>

                    {/* [MUDANÇA 6]: Tag indicando janela ativa de re-cast */}
                    {isRecastActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-amber-950 text-amber-400 border border-amber-800">
                            Fase {currentCast} ({recastWindowRemaining.toFixed(1)}s)
                        </span>
                    )}

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

                    {/* [MUDANÇA 7]: Estilização dinâmica com destaque quando está em janela de recast */}
                    <button
                        type="button"
                        disabled={isOnCooldown}
                        onClick={handleCastSkill}
                        className={`px-2.5 py-1 font-bold text-xs rounded transition-all ml-1 ${
                            isOnCooldown
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 font-mono pointer-events-none'
                                : isRecastActive
                                    ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 cursor-pointer shadow-sm animate-pulse'
                                    : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 cursor-pointer shadow-sm'
                        }`}
                    >
                        {buttonLabel}
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