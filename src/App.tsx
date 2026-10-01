import { useState } from 'react';
import { mockChampions } from './data/mockChampions';
import { mockItems } from './data/mockItems';
import { computeUnitStats, calculateEffectiveDamage } from './engine/calculator';
import { calculateAttackTiming, calculateAutoAttackDamage } from './engine/autoAttack';
import { executeAbilityCast } from './engine/combatEngine';
import { mitigateDamage } from './engine/mitigation';
import { useCombatLog } from './hooks/useCombatLog';
import { useCombatLoop } from './hooks/useCombatLoop';
import type { Item, QueuedCombatHit } from './types/game';

import { ChampionPanel } from './components/ChampionPanel/ChampionPanel';
import { SkillCard } from './components/Skills/SkillCard';
import { ItemPassivesSection } from './components/Items/ItemPassiveSection';
import { HealthBar } from './components/Combat/HealthBar';
import { ResourceBar } from './components/ChampionPanel/ResourceBar';
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
        skillRanks,
        onLogBatch: pushCombatLogs,
    });

    const handleTriggerAutoAttack = () => {
        if (engine.attackCooldownRemaining > 0 || engine.attackWindupRemaining > 0) return;

        const timing = calculateAttackTiming(attackerStats.atkSpeed);

        // Check if an Empowered Skill is queued (Renekton W or Garen Q)
        if (engine.activeEmpower) {
            const skill = attackerChamp.skills.find((s) => s.key === engine.activeEmpower?.skillKey);
            if (skill) {
                const isFury = attackerStats.resourceType === 'fury';
                const hasEmpFury = isFury && engine.activeEmpower.furyCost > 0;
                const activeStages = skill.stages.filter((s) =>
                    !skill.stages.some((st) => st.isEmpowered) ? true : hasEmpFury ? s.isEmpowered : !s.isEmpowered
                );

                // Multi-Hit Case (e.g. Renekton W: 2 hits normal, 3 hits empowered)
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
                        if (idx === 0 && engine.spellbladeState.active) {
                            const extraMit = mitigateDamage(
                                engine.spellbladeState.extraDamage,
                                engine.spellbladeState.damageType,
                                attackerStats,
                                targetStats
                            );
                            extraSpellblade = extraMit.effectiveDamage;
                        }

                        return {
                            id: `${stage.id}_${Date.now()}_${idx}`,
                            delayRemaining: idx * 0.1, // 100ms interval between strikes
                            sourceName: `${skill.name} (Hit ${idx + 1}${hasEmpFury ? ' - Empowered' : ''})`,
                            damageAmount: calculated.effectiveDamage + extraSpellblade,
                            damageType: stage.damageType,
                            furyGain: isFury && !hasEmpFury ? 5 : 0,
                        };
                    });

                    engine.enqueueHits(hitsToQueue);

                    if (engine.activeEmpower.furyCost > 0) {
                        engine.setAttackerResource((f) => Math.max(0, f - engine.activeEmpower!.furyCost));
                    }

                    if (engine.spellbladeState.active) {
                        engine.setSpellbladeState((s) => ({ ...s, active: false, durationRemaining: 0 }));
                    }

                    engine.setActiveEmpower(null);
                    engine.setAttackWindupRemaining(0.08);
                    engine.setAttackCooldownRemaining(timing.cycleTime);
                    return; // CRITICAL: Stop here to prevent executing normal auto-attack damage
                }

                // Single Empowered Hit Case (e.g. Garen Q)
                const singleStage = activeStages[0];
                if (singleStage) {
                    const res = calculateEffectiveDamage(
                        singleStage,
                        engine.activeEmpower.rank,
                        attackerStats,
                        targetStats,
                        engine.targetCurrentHp
                    );

                    let attackResult = calculateAutoAttackDamage(attackerStats, targetStats, engine.spellbladeState);
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

        // Standard Auto-Attack execution
        const attackResult = calculateAutoAttackDamage(attackerStats, targetStats, engine.spellbladeState);
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
        });

        if (result.shouldResetAttackTimer) {
            engine.setAttackCooldownRemaining(0);
            engine.setAttackWindupRemaining(0);
            engine.pendingAttackRef.current = null;
        }

        engine.setTargetCurrentHp(result.nextHp);
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
                onResetHp={() => engine.setTargetCurrentHp(targetStats.totalHp)}
                onResetAll={() => {
                    engine.resetCombat();
                    clearCombatLogs();
                }}
            />

            {/* Main Dual Champion Grid */}
            <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <ChampionPanel
                        role="attacker"
                        selectedChampionId={attackerChampionId}
                        level={attackerLevel}
                        items={attackerItems}
                        computedStats={attackerStats}
                        availableChampions={mockChampions}
                        availableItems={mockItems}
                        onChampionChange={setAttackerChampionId}
                        onLevelChange={setAttackerLevel}
                        onItemChange={(idx, id) => handleItemChange(true, idx, id)}
                    />
                    <ResourceBar
                        resourceType={attackerStats.resourceType}
                        currentValue={engine.attackerResource}
                        maxValue={attackerStats.maxResource}
                        onChange={engine.setAttackerResource}
                    />
                </div>

                <div>
                    <ChampionPanel
                        role="target"
                        selectedChampionId={targetChampionId}
                        level={targetLevel}
                        items={targetItems}
                        computedStats={targetStats}
                        availableChampions={mockChampions}
                        availableItems={mockItems}
                        onChampionChange={setTargetChampionId}
                        onLevelChange={setTargetLevel}
                        onItemChange={(idx, id) => handleItemChange(false, idx, id)}
                    />
                    <ResourceBar
                        resourceType={targetStats.resourceType}
                        currentValue={engine.targetResource}
                        maxValue={targetStats.maxResource}
                        onChange={engine.setTargetResource}
                    />
                </div>
            </div>

            {/* Target Health Bar */}
            <div className="max-w-6xl w-full">
                <HealthBar
                    currentHp={engine.targetCurrentHp}
                    maxHp={targetStats.totalHp}
                    onReset={() => engine.setTargetCurrentHp(targetStats.totalHp)}
                />
            </div>

            {/* Combat Log */}
            <CombatLog entries={combatLogs} onClear={clearCombatLogs} />

            {/* Active DoT Badges */}
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

            {/* Combat Actions Section */}
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