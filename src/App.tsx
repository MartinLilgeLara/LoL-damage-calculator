import { useState } from 'react';
import { mockChampions } from './data/mockChampions';
import { mockItems } from './data/mockItems';
import { computeUnitStats, calculateEffectiveDamage } from './engine/calculator';
import { calculateAttackTiming, calculateAutoAttackDamage, calculateItemOnHitDamage } from './engine/autoAttack';
import { executeAbilityCast } from './engine/combatEngine';
import { mitigateDamage } from './engine/mitigation';
import { useCombatLog } from './hooks/useCombatLog';
import { useCombatLoop } from './hooks/useCombatLoop';
import type { Item, QueuedCombatHit } from './types/game';

import { ChampionCardHUD } from './components/ChampionPanel/ChampionCardHUD';
import { SkillCard } from './components/Skills/SkillCard';
import { ItemPassivesSection } from './components/Items/ItemPassiveSection';
import { CombatControlsBar } from './components/Combat/CombatControlsBar';
import { AutoAttackCard } from './components/Combat/AutoAttackCard';
import { CombatLog } from './components/Combat/CombatLog';

export default function App() {
    const [attackerChampionId, setAttackerChampionId] = useState<string>(mockChampions[0].id);
    const [attackerLevel, setAttackerLevel] = useState<number>(3);
    const [attackerItems, setAttackerItems] = useState<(Item | null)[]>(Array(6).fill(null));

    const [targetChampionId, setTargetChampionId] = useState<string>(mockChampions[1].id);
    const [targetLevel, setTargetLevel] = useState<number>(3);
    const [targetItems, setTargetItems] = useState<(Item | null)[]>(Array(6).fill(null));

    const [skillRanks, setSkillRanks] = useState<Record<string, number>>({ Q: 1, W: 1, E: 1, R: 1 });

    const attackerChamp = mockChampions.find((c) => c.id === attackerChampionId) || mockChampions[0];
    const targetChamp = mockChampions.find((c) => c.id === targetChampionId) || mockChampions[1];

    const attackerStats = computeUnitStats(attackerChamp, attackerLevel, attackerItems);
    const targetStats = computeUnitStats(targetChamp, targetLevel, targetItems);

    const { combatLogs, pushCombatLogs, clearCombatLogs } = useCombatLog();
    const engine = useCombatLoop({
        attackerChamp,
        attackerStats,
        targetStats,
        attackerItems,
        skillRanks,
        onLogBatch: pushCombatLogs,
    });

    const handleTriggerAutoAttack = () => {
        // Se houver empower ativo de reset de timer, permite atacar mesmo com cooldown residual
        if (!engine.activeEmpower) {
            if (engine.attackCooldownRemaining > 0 || engine.attackWindupRemaining > 0) return;
        }

        const timing = calculateAttackTiming(attackerStats.atkSpeed);

        // Disparo do ataque empoderado (Renekton W ou Garen Q)
        if (engine.activeEmpower) {
            const skill = attackerChamp.skills.find((s) => s.key === engine.activeEmpower?.skillKey);
            if (skill) {
                const isFury = attackerStats.resourceType === 'fury';

                // >>> [CORREÇÃO: O golpe é empoderado se o buff foi ativado com fúria OU se o atacante tem 50+ de fúria] <<<
                const isEmpoweredStrike = isFury && (engine.activeEmpower.furyCost >= 50 || engine.attackerResource >= 50);

                const activeStages = skill.stages.filter((stage) => {
                    if (stage.isEmpowered === undefined) return true;
                    return isEmpoweredStrike ? stage.isEmpowered === true : stage.isEmpowered === false;
                });

                // Caso Multi-Hit (Renekton W: 2 hits normais ou 3 empoderados)
                if (activeStages.length > 1) {
                    const hitsToQueue: QueuedCombatHit[] = activeStages.map((stage, idx) => {
                        const calculated = calculateEffectiveDamage(
                            stage,
                            engine.activeEmpower!.rank,
                            attackerStats,
                            targetStats,
                            engine.targetCurrentHp
                        );

                        let extraSpellblade = 0;
                        let spellbladeTag = '';
                        if (idx === 0 && engine.spellbladeState.active) {
                            const extraMit = mitigateDamage(
                                engine.spellbladeState.extraDamage,
                                engine.spellbladeState.damageType,
                                attackerStats,
                                targetStats
                            );
                            extraSpellblade = extraMit.effectiveDamage;
                            spellbladeTag = `+${engine.spellbladeState.sourceItemName} (${extraSpellblade})`;
                        }

                        let onHitExtra = 0;
                        let onHitTag = '';
                        const onHitEffect = calculateItemOnHitDamage(attackerItems, attackerStats);
                        if (onHitEffect && onHitEffect.rawExtra > 0) {
                            const onHitMit = mitigateDamage(onHitEffect.rawExtra, onHitEffect.damageType, attackerStats, targetStats);
                            onHitExtra = onHitMit.effectiveDamage;
                            onHitTag = `+${onHitEffect.itemName} (${onHitExtra})`;
                        }

                        const totalEffectiveHit = calculated.effectiveDamage + extraSpellblade + onHitExtra;

                        const healedAmount = attackerStats.lifesteal > 0 && stage.damageType === 'physical'
                            ? Math.round(totalEffectiveHit * (attackerStats.lifesteal / 100))
                            : 0;

                        const activeNotes = [spellbladeTag, onHitTag].filter(Boolean).join(' | ');

                        return {
                            id: `${stage.id}_${Date.now()}_${idx}`,
                            delayRemaining: idx * 0.1, // 0.1s entre cada golpe
                            sourceName: `${skill.name} (Hit ${idx + 1}${isEmpoweredStrike ? ' - Empowered' : ''})`,
                            damageAmount: totalEffectiveHit,
                            damageType: stage.damageType,
                            furyGain: isFury && !isEmpoweredStrike ? 5 : 0,
                            healedAmount,
                            note: activeNotes || undefined,
                        };
                    });

                    engine.enqueueHits(hitsToQueue);

                    // >>> [CORREÇÃO: Consome os 50 de fúria apenas agora, quando o ataque conecta!] <<<
                    if (isEmpoweredStrike) {
                        engine.setAttackerResource((f) => Math.max(0, f - 50));
                    }

                    if (engine.spellbladeState.active) {
                        engine.setSpellbladeState((s) => ({ ...s, active: false, durationRemaining: 0 }));
                    }

                    engine.setActiveEmpower(null);
                    engine.pendingAttackRef.current = null;
                    engine.setAttackWindupRemaining(0);
                    engine.setAttackCooldownRemaining(timing.cycleTime);
                    return;
                }

                // Caso Empower de Golpe Único (ex: Garen Q)
                const singleStage = activeStages[0];
                if (singleStage) {
                    const res = calculateEffectiveDamage(
                        singleStage,
                        engine.activeEmpower.rank,
                        attackerStats,
                        targetStats,
                        engine.targetCurrentHp
                    );

                    let attackResult = calculateAutoAttackDamage(
                        attackerStats,
                        targetStats,
                        attackerItems,
                        engine.spellbladeState
                    );

                    attackResult = {
                        ...attackResult,
                        rawDamage: attackResult.rawDamage + res.rawDamage,
                        effectiveDamage: attackResult.effectiveDamage + res.effectiveDamage,
                    };

                    if (engine.activeEmpower.furyCost > 0) {
                        engine.setAttackerResource((f) => Math.max(0, f - engine.activeEmpower!.furyCost));
                    }
                    if (engine.spellbladeState.active) {
                        engine.setSpellbladeState((s) => ({ ...s, active: false, durationRemaining: 0 }));
                    }

                    engine.setActiveEmpower(null);
                    engine.pendingAttackRef.current = attackResult;
                    engine.setAttackWindupRemaining(timing.windupTime);
                    engine.setAttackCooldownRemaining(timing.cycleTime);
                    return;
                }
            }
        }

        // Auto-Ataque Padrão
        const attackResult = calculateAutoAttackDamage(
            attackerStats,
            targetStats,
            attackerItems,
            engine.spellbladeState
        );

        if (engine.spellbladeState.active) {
            engine.setSpellbladeState((s) => ({ ...s, active: false, durationRemaining: 0 }));
        }

        engine.pendingAttackRef.current = attackResult;
        engine.setAttackWindupRemaining(timing.windupTime);
        engine.setAttackCooldownRemaining(timing.cycleTime);
    };

    const handleCastSkill = (damageAmount: number, furyCost: number = 0, skillKey?: string) => {
        if (!skillKey) return;

        const result = executeAbilityCast({
            skillKey,
            damageAmount,
            furyCost,
            attackerChamp,
            attackerStats,
            targetStats,
            attackerItems,
            skillRanks,
            currentCooldowns: engine.cooldowns,
            currentRecasts: engine.recasts,
            currentHp: engine.targetCurrentHp,
            currentResource: engine.attackerResource,
            spellbladeState: engine.spellbladeState,
            currentActiveEmpower: engine.activeEmpower, // Passa o empower atual para ser preservado
        });

        if (result.shouldResetAttackTimer) {
            engine.setAttackCooldownRemaining(0);
            engine.setAttackWindupRemaining(0);
            engine.pendingAttackRef.current = null;
        }

        engine.setTargetCurrentHp(result.nextHp);
        if (result.attackerHealedAmount > 0) {
            engine.setAttackerCurrentHp((hp) => Math.min(attackerStats.totalHp, hp + result.attackerHealedAmount));
        }
        engine.setAttackerResource(result.nextResource);
        engine.setCooldowns(result.nextCooldowns);
        engine.setRecasts(result.nextRecasts);
        engine.setSpellbladeState(result.nextSpellblade);
        engine.setActiveEmpower(result.newActiveEmpower);

        if (result.dotsToPush.length > 0) {
            engine.setActiveDots((prev) => {
                const filtered = prev.filter((d) => !result.dotsToPush.some((incoming) => incoming.id === d.id));
                return [...filtered, ...result.dotsToPush];
            });
        }

        if (result.logsToPush.length > 0) {
            pushCombatLogs(result.logsToPush);
        }

        engine.setOutOfCombatTimer(0);
    };

    const handleItemChange = (isAttacker: boolean, idx: number, itemId: string) => {
        const item = mockItems.find((i) => i.id === itemId) || null;
        if (isAttacker) {
            const next = [...attackerItems];
            next[idx] = item;
            setAttackerItems(next);
        } else {
            const next = [...targetItems];
            next[idx] = item;
            setTargetItems(next);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center gap-6">
            <header className="max-w-6xl w-full flex justify-between items-center border-b border-slate-800/80 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-amber-400">LoL Combat Engine Simulator</h1>
                    <p className="text-sm text-slate-400">Real-time Game Loop Simulator (Renekton vs Garen)</p>
                </div>
            </header>

            <CombatControlsBar
                isPaused={engine.isPaused}
                timeScale={engine.timeScale}
                onTogglePause={() => engine.setIsPaused(!engine.isPaused)}
                onTimeScaleChange={(speed) => {
                    engine.setTimeScale(speed);
                    engine.setIsPaused(false);
                }}
                onResetCooldowns={() => {
                    engine.setCooldowns({ Q: 0, W: 0, E: 0, R: 0 });
                    engine.setRecasts({});
                }}
                onResetHp={() => {
                    engine.setAttackerCurrentHp(attackerStats.totalHp);
                    engine.setTargetCurrentHp(targetStats.totalHp);
                }}
                onResetAll={() => {
                    engine.resetCombat();
                    clearCombatLogs();
                }}
            />

            {/* Layout dos Campeões */}
            <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChampionCardHUD
                    role="attacker"
                    champion={attackerChamp}
                    level={attackerLevel}
                    items={attackerItems}
                    stats={attackerStats}
                    currentHp={engine.attackerCurrentHp}
                    maxHp={attackerStats.totalHp}
                    currentResource={engine.attackerResource}
                    maxResource={attackerStats.maxResource}
                    resourceType={attackerStats.resourceType}
                    availableChampions={mockChampions}
                    availableItems={mockItems}
                    onChampionChange={setAttackerChampionId}
                    onLevelChange={setAttackerLevel}
                    onItemChange={(idx, id) => handleItemChange(true, idx, id)}
                    onResourceChange={engine.setAttackerResource}
                    onHpChange={engine.setAttackerCurrentHp}
                />

                <ChampionCardHUD
                    role="target"
                    champion={targetChamp}
                    level={targetLevel}
                    items={targetItems}
                    stats={targetStats}
                    currentHp={engine.targetCurrentHp}
                    maxHp={targetStats.totalHp}
                    currentResource={engine.targetResource}
                    maxResource={targetStats.maxResource}
                    resourceType={targetStats.resourceType}
                    availableChampions={mockChampions}
                    availableItems={mockItems}
                    onChampionChange={setTargetChampionId}
                    onLevelChange={setTargetLevel}
                    onItemChange={(idx, id) => handleItemChange(false, idx, id)}
                    onResourceChange={engine.setTargetResource}
                    onHpChange={engine.setTargetCurrentHp}
                />
            </div>

            {/* Combat Log */}
            <CombatLog entries={combatLogs} onClear={clearCombatLogs} />

            {/* Badges de DoT Ativos */}
            {engine.activeDots.length > 0 && (
                <div className="max-w-6xl w-full flex flex-wrap gap-2">
                    {engine.activeDots.map((dot) => (
                        <div
                            key={dot.id}
                            className="bg-amber-950/40 border border-amber-800/80 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs"
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span className="text-amber-200 font-bold">{dot.sourceName} active:</span>
                            <span className="font-mono text-amber-400 font-bold">
                                {dot.durationRemaining.toFixed(1)}s remaining
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Seção de Ações */}
            <section className="max-w-6xl w-full space-y-4">
                <AutoAttackCard
                    attackerStats={attackerStats}
                    targetStats={targetStats}
                    attackWindupRemaining={engine.attackWindupRemaining}
                    attackCooldownRemaining={engine.attackCooldownRemaining}
                    spellblade={engine.spellbladeState}
                    activeEmpower={engine.activeEmpower}
                    onAttack={handleTriggerAutoAttack}
                />

                {attackerChamp.skills.map((skill) => (
                    <SkillCard
                        key={skill.key}
                        skill={skill}
                        currentRank={skillRanks[skill.key] || 1}
                        attackerStats={attackerStats}
                        targetStats={targetStats}
                        attackerResource={engine.attackerResource}
                        onRankChange={(rank) => setSkillRanks((prev) => ({ ...prev, [skill.key]: rank }))}
                        onCast={(dmg, fury) => handleCastSkill(dmg, fury, skill.key)}
                        targetCurrentHp={engine.targetCurrentHp}
                        cooldownRemaining={engine.cooldowns[skill.key] || 0}
                        currentCast={engine.recasts[skill.key]?.currentCast || 1}
                        recastWindowRemaining={engine.recasts[skill.key]?.windowRemaining || 0}
                        isEmpowerActive={engine.activeEmpower?.skillKey === skill.key}
                    />
                ))}
            </section>

            <ItemPassivesSection
                items={attackerItems}
                attackerStats={attackerStats}
                targetStats={targetStats}
            />
        </div>
    );
}