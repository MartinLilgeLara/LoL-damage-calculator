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
    isEmpowerActive?: boolean;
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
    isEmpowerActive = false,
    onRankChange,
    onCast,
}: SkillCardProps) {
    const isOnCooldown = cooldownRemaining > 0;
    const isFuryUser = attackerStats.resourceType === 'fury';
    const hasEmpoweredFury = isFuryUser && attackerResource >= 50;

    // Cooldowns por nível para exibição
    const allCooldowns = skill.cooldown ?? [];
    const baseCdAtRank = allCooldowns[currentRank - 1] ?? allCooldowns[0] ?? 0;
    const actualCd = calculateActualCooldown(baseCdAtRank, attackerStats.haste);

    // Estágios do cast atual
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
        if (skill.empowersNextAttack) {
            const furySpent = hasEmpoweredStages && hasEmpoweredFury ? 50 : 0;
            onCast(0, furySpent);
            return;
        }
        const instantStages = activeStages.filter((stage) => stage.isOverTime !== true);
        const totalDamage = instantStages.reduce((acc, stage) => {
            const calculated = calculateEffectiveDamage(stage, currentRank, attackerStats, targetStats, targetCurrentHp);
            return acc + calculated.effectiveDamage;
        }, 0);
        const furySpent = hasEmpoweredStages && hasEmpoweredFury ? 50 : 0;
        onCast(totalDamage, furySpent);
    };

    const isRecastActive = currentCast > 1;

    const renderScalingFormula = (s: ScalingRatio) => {
        const ratioVal = s.ratio[currentRank - 1] ?? s.ratio[0] ?? 0;
        const percent = Math.round(ratioVal * 100);
        const colorMap: Record<string, string> = {
            baseAd: 'text-orange-400',
            totalAd: 'text-orange-400',
            bonusAd: 'text-orange-400',
            ap: 'text-cyan-400',
            totalHp: 'text-emerald-400',
            bonusHp: 'text-emerald-400',
            targetMaxHp: 'text-purple-400',
            targetMissingHp: 'text-red-400',
        };
        const labelMap: Record<string, string> = {
            baseAd: 'base AD',
            totalAd: 'AD',
            bonusAd: 'bonus AD',
            ap: 'AP',
            totalHp: 'HP',
            bonusHp: 'bonus HP',
            targetMaxHp: "target's max HP",
            targetMissingHp: "target's missing HP",
        };
        const color = colorMap[s.attribute] ?? 'text-slate-300';
        const label = labelMap[s.attribute] ?? s.attribute;
        return (
            <span key={s.attribute} className={`${color} font-semibold`}>
                +{percent}% {label}
            </span>
        );
    };

    // Exibe cooldown de todos os níveis
    const cdDisplay = allCooldowns
        .slice(0, skill.maxRank)
        .map((cd) => (attackerStats.haste > 0 ? calculateActualCooldown(cd, attackerStats.haste) : cd))
        .join(' / ');

    // Estado do botão de cast
    const castBtnClass = isOnCooldown
        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 pointer-events-none'
        : isEmpowerActive
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 cursor-default animate-pulse'
            : isRecastActive
                ? 'bg-amber-600 hover:bg-amber-500 text-slate-950 cursor-pointer shadow animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 cursor-pointer shadow';

    const castBtnLabel = isOnCooldown
        ? `${cooldownRemaining.toFixed(1)}s`
        : isEmpowerActive
            ? 'On Next Hit'
            : isRecastActive
                ? `Cast ${currentCast} (${recastWindowRemaining.toFixed(1)}s)`
                : 'Cast';

    return (
        <div className="bg-[#0a0e1a] border border-[#1e2a3a] rounded-xl overflow-hidden text-left shadow-lg">

            {/* ── Header: ícone + nome + key ── */}
            <div className="flex items-stretch gap-0">
                {/* Ícone da Habilidade */}
                <div className="relative shrink-0 w-16 h-16">
                    {skill.iconUrl ? (
                        <img
                            src={skill.iconUrl}
                            alt={skill.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <span className="text-xl font-bold text-slate-500">{skill.key}</span>
                        </div>
                    )}
                    {/* Key badge sobreposto */}
                    <span className="absolute bottom-0.5 left-0.5 text-[10px] font-black bg-black/80 text-amber-300 px-1 rounded leading-tight">
                        {skill.key}
                    </span>
                    {/* Overlay de cooldown */}
                    {isOnCooldown && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <span className="text-sm font-black text-white font-mono drop-shadow">
                                {cooldownRemaining.toFixed(1)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Nome + status badges */}
                <div className="flex-1 flex flex-col justify-center px-3 py-2 border-l border-[#1e2a3a] bg-[#0d1220]">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#c8aa6e]">{skill.name}</span>

                        {isRecastActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-950 text-amber-400 border border-amber-800">
                                Phase {currentCast} · {recastWindowRemaining.toFixed(1)}s
                            </span>
                        )}
                        {hasEmpoweredStages && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                hasEmpoweredFury
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                                {hasEmpoweredFury ? '⚡ Empowered' : 'Normal'}
                            </span>
                        )}
                    </div>

                    {/* Cooldown da skill */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">CD:</span>
                        <span className="text-[11px] font-mono text-slate-300">
                            {cdDisplay}s
                        </span>
                        {attackerStats.haste > 0 && (
                            <span className="text-[10px] text-slate-600">
                                (base: {allCooldowns.slice(0, skill.maxRank).join('/')}) · {attackerStats.haste} AH
                            </span>
                        )}
                        <span className="text-[10px] text-slate-500 ml-auto">
                            🕐 {actualCd}s @ rank {currentRank}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Descrição da habilidade ── */}
            {skill.description && (
                <div className="px-3 py-2 border-t border-[#1e2a3a] bg-[#080c18]">
                    <p className="text-[11px] text-[#a0a8b8] leading-relaxed">{skill.description}</p>
                </div>
            )}

            {/* ── Seleção de Rank ── */}
            <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1e2a3a] bg-[#0a0e1a]">
                <span className="text-[10px] text-slate-500 uppercase tracking-wide shrink-0">Rank</span>
                <div className="flex gap-1">
                    {Array.from({ length: skill.maxRank }, (_, i) => i + 1).map((rank) => (
                        <button
                            key={rank}
                            type="button"
                            onClick={() => onRankChange(rank)}
                            className={`w-6 h-6 rounded text-[11px] font-bold transition-all ${
                                currentRank === rank
                                    ? 'bg-[#c8aa6e] text-[#010a13] shadow'
                                    : 'bg-[#1e2a3a] hover:bg-[#2a3a4a] text-slate-400'
                            }`}
                        >
                            {rank}
                        </button>
                    ))}
                </div>
                <div className="ml-auto">
                    <button
                        type="button"
                        disabled={isOnCooldown || isEmpowerActive}
                        onClick={handleCastSkill}
                        className={`px-3 py-1 text-xs font-bold rounded transition-all ${castBtnClass}`}
                    >
                        {castBtnLabel}
                    </button>
                </div>
            </div>

            {/* ── Danos por Estágio ── */}
            <div className="px-3 pb-3 pt-1 border-t border-[#1e2a3a] space-y-2">
                {activeStages.map((stage) => {
                    const rankIdx = Math.min(currentRank - 1, stage.baseDamage.length - 1);
                    const baseDmg = stage.baseDamage[rankIdx] ?? 0;

                    return (
                        <div key={stage.id} className="space-y-1">
                            <SkillStageCard
                                stage={stage}
                                rank={currentRank}
                                attackerStats={attackerStats}
                                targetStats={targetStats}
                                targetCurrentHp={targetCurrentHp}
                            />
                            {/* Linha de fórmula estilo tooltip do LoL */}
                            <div className="text-[10px] text-slate-500 px-1 flex items-center gap-1 flex-wrap">
                                <span className="text-slate-600 font-mono">Formula:</span>
                                <span className="text-slate-300 font-mono">{baseDmg}</span>
                                {stage.scalings.map((scaling) => (
                                    <span key={scaling.attribute} className="font-mono">
                                        {renderScalingFormula(scaling)}
                                    </span>
                                ))}
                                {stage.isOverTime && stage.tickInterval && (
                                    <span className="text-slate-600 ml-1">
                                        · per {stage.tickInterval}s tick · {stage.durationSeconds}s duration
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}