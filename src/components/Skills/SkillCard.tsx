import type { Skill, ComputedUnitStats, ScalingRatio } from '../../types/game';
import { calculateEffectiveDamage } from '../../engine/calculator';
import { calculateActualCooldown } from '../../engine/gameLoop';
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
    currentCast?: number;
    recastWindowRemaining?: number;
    isEmpowerActive?: boolean; // [1. DECLARADO NA INTERFACE]
}

export function SkillCard({
                              skill,
                              currentRank,
                              attackerStats,
                              targetStats,
                              attackerResource,
                              targetCurrentHp,
                              cooldownRemaining = 0,
                              currentCast = 1,
                              recastWindowRemaining = 0,
                              isEmpowerActive = false, // [2. DESESTRUTURADO AQUI COM DEFAULT FALSE]
                              onRankChange,
                              onCast,
                          }: SkillCardProps) {
    const isOnCooldown = cooldownRemaining > 0;
    const isFuryUser = attackerStats.resourceType === 'fury';
    const hasEmpoweredFury = isFuryUser && attackerResource >= 50;

    // Tempo de recarga para o nível atual da habilidade
    const baseCdAtRank = skill.cooldown ? (skill.cooldown[currentRank - 1] ?? skill.cooldown[0]) : 0;
    const actualCd = calculateActualCooldown(baseCdAtRank, attackerStats.haste);

    // Filtra os estágios de acordo com o cast atual
    const stagesForCurrentCast = skill.stages.filter(
        (s) => (s.castIndex ?? 1) === currentCast
    );

    const hasEmpoweredStages = stagesForCurrentCast.some((s) => s.isEmpowered === true);
    const activeStages = stagesForCurrentCast.filter((stage) => {
        if (!hasEmpoweredStages) return true;
        return hasEmpoweredFury ? stage.isEmpowered === true : stage.isEmpowered !== true;
    });

    const handleCastSkill = () => {
        if (isOnCooldown || isEmpowerActive) return;

        // Se a habilidade empodera o próximo auto-ataque, o dano NÃO é imediato
        if (skill.empowersNextAttack) {
            const furySpent = hasEmpoweredStages && hasEmpoweredFury ? 50 : 0;
            onCast(0, furySpent);
            return;
        }

        // Filtra apenas estágios instantâneos (estágios com isOverTime rodam via gameLoop)
        const instantStages = activeStages.filter((stage) => stage.isOverTime !== true);

        const totalDamage = instantStages.reduce((acc, stage) => {
            const calculated = calculateEffectiveDamage(
                stage,
                currentRank,
                attackerStats,
                targetStats,
                targetCurrentHp
            );
            return acc + calculated.effectiveDamage;
        }, 0);

        const furySpent = hasEmpoweredStages && hasEmpoweredFury ? 50 : 0;
        onCast(totalDamage, furySpent);
    };

    const isRecastActive = currentCast > 1;

    const renderScalingText = (s: ScalingRatio) => {
        const ratioVal = s.ratio[currentRank - 1] ?? s.ratio[0] ?? 0;
        const percent = Math.round(ratioVal * 100);

        switch (s.attribute) {
            case 'totalAd':
                return <span key={s.attribute} className="text-orange-400 font-semibold">(+{percent}% AD)</span>;
            case 'bonusAd':
                return <span key={s.attribute} className="text-orange-400 font-semibold">(+{percent}% bAD)</span>;
            case 'ap':
                return <span key={s.attribute} className="text-cyan-400 font-semibold">(+{percent}% AP)</span>;
            case 'totalHp':
            case 'bonusHp':
                return <span key={s.attribute} className="text-emerald-400 font-semibold">(+{percent}% HP)</span>;
            case 'targetMissingHp':
                return <span key={s.attribute} className="text-slate-100 font-semibold">(+{percent}% Missing HP)</span>;
            default:
                return <span key={s.attribute} className="text-slate-400">({percent}%)</span>;
        }
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-left">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                        {skill.key}
                    </span>
                    <strong className="text-base text-slate-100">{skill.name}</strong>

                    {/* Informação de Cooldown Estilo LoL */}
                    <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        ⏳ {actualCd}s
                        {attackerStats.haste > 0 && (
                            <span className="text-[10px] text-slate-500 ml-1">
                                (Base: {baseCdAtRank}s | {attackerStats.haste} AH)
                            </span>
                        )}
                    </span>

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

                    <button
                        type="button"
                        disabled={isOnCooldown || isEmpowerActive}
                        onClick={handleCastSkill}
                        className={`px-3 py-1 font-bold text-xs rounded transition-all ml-1 ${
                            isOnCooldown
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 font-mono pointer-events-none'
                                : isEmpowerActive
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 cursor-default animate-pulse'
                                    : isRecastActive
                                        ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 cursor-pointer shadow-sm animate-pulse'
                                        : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 cursor-pointer shadow-sm'
                        }`}
                    >
                        {isOnCooldown
                            ? `${cooldownRemaining.toFixed(1)}s`
                            : isEmpowerActive
                                ? 'Ready on Next Hit'
                                : isRecastActive
                                    ? `Cast ${currentCast} (${recastWindowRemaining.toFixed(1)}s)`
                                    : 'Cast'}
                    </button>
                </div>

                {/* Seleção de Nível da Habilidade */}
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

            {/* Decomposição dos Danos com Fórmulas e Cores Oficiais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {activeStages.map((stage) => {
                    const rankIdx = Math.min(currentRank - 1, stage.baseDamage.length - 1);
                    const baseDamageVal = stage.baseDamage[rankIdx] ?? 0;

                    return (
                        <div key={stage.id} className="flex flex-col gap-1">
                            <SkillStageCard
                                stage={stage}
                                rank={currentRank}
                                attackerStats={attackerStats}
                                targetStats={targetStats}
                                targetCurrentHp={targetCurrentHp}
                            />
                            {/* Linha de Fórmula ao Estilo Tooltip do LoL */}
                            <div className="text-[11px] text-slate-400 px-2 py-1 bg-slate-950/60 rounded border border-slate-800/60 flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-500 font-mono">Fórmula:</span>
                                <span className="text-slate-200 font-mono font-medium">{baseDamageVal}</span>
                                {stage.scalings.map((scaling) => (
                                    <span key={scaling.attribute} className="font-mono">
                                        + {renderScalingText(scaling)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}