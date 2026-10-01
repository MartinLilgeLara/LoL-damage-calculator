import { useState, useEffect, useRef, useCallback } from 'react';
import type { ComputedUnitStats, RecastStates, ActiveAttackEmpower, Champion, QueuedCombatHit } from '../types/game';
import type { SpellbladeBuff, AutoAttackResult } from '../engine/autoAttack';
import {
    calculateHpRegen,
    calculateResourceTick,
    updateCooldowns,
    updateRecastWindows,
    calculateActualCooldown,
    processActiveDots,
    type ActiveDotInstance,
    type CombatCooldowns,
} from '../engine/gameLoop';
import type { RawLogPayload } from './useCombatLog';

interface CombatLoopProps {
    attackerChamp: Champion;
    attackerStats: ComputedUnitStats;
    targetStats: ComputedUnitStats;
    skillRanks: Record<string, number>;
    onLogBatch: (logs: RawLogPayload[]) => void;
}

export function useCombatLoop({
                                  attackerChamp,
                                  attackerStats,
                                  targetStats,
                                  skillRanks,
                                  onLogBatch,
                              }: CombatLoopProps) {
    const [targetCurrentHp, setTargetCurrentHp] = useState<number>(targetStats.totalHp);
    const [attackerResource, setAttackerResource] = useState<number>(0);
    const [targetResource, setTargetResource] = useState<number>(0);

    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [timeScale, setTimeScale] = useState<number>(1.0);
    const [outOfCombatTimer, setOutOfCombatTimer] = useState<number>(0);

    const [cooldowns, setCooldowns] = useState<CombatCooldowns>({ Q: 0, W: 0, E: 0, R: 0 });
    const [recasts, setRecasts] = useState<RecastStates>({});
    const [activeDots, setActiveDots] = useState<ActiveDotInstance[]>([]);
    const [queuedHits, setQueuedHits] = useState<QueuedCombatHit[]>([]);

    const [spellbladeState, setSpellbladeState] = useState<SpellbladeBuff>({
        active: false,
        durationRemaining: 0,
        cooldownRemaining: 0,
        sourceItemName: '',
        damageType: 'physical',
        extraDamage: 0,
    });
    const [activeEmpower, setActiveEmpower] = useState<ActiveAttackEmpower | null>(null);

    const [attackCooldownRemaining, setAttackCooldownRemaining] = useState<number>(0);
    const [attackWindupRemaining, setAttackWindupRemaining] = useState<number>(0);
    const pendingAttackRef = useRef<AutoAttackResult | null>(null);

    const targetHpRef = useRef<number>(targetCurrentHp);
    targetHpRef.current = targetCurrentHp;
    const lastTimeRef = useRef<number | null>(null);

    const enqueueHits = useCallback((hits: QueuedCombatHit[]) => {
        setQueuedHits((prev) => [...prev, ...hits]);
    }, []);

    useEffect(() => {
        setAttackerResource(attackerStats.resourceType === 'fury' ? 0 : attackerStats.maxResource);
        setCooldowns({ Q: 0, W: 0, E: 0, R: 0 });
        setOutOfCombatTimer(0);
    }, [attackerChamp.id, attackerStats.maxResource, attackerStats.resourceType]);

    useEffect(() => {
        setTargetResource(targetStats.resourceType === 'fury' ? 0 : targetStats.maxResource);
        setTargetCurrentHp(targetStats.totalHp);
    }, [targetStats.maxResource, targetStats.resourceType, targetStats.totalHp]);

    useEffect(() => {
        let frameId: number;

        const loop = (time: number) => {
            if (lastTimeRef.current !== null) {
                const rawDelta = (time - lastTimeRef.current) / 1000;
                const safeDelta = Math.min(rawDelta, 0.1);
                const effectiveDelta = isPaused ? 0 : safeDelta * timeScale;

                if (effectiveDelta > 0) {
                    setOutOfCombatTimer((prev) => prev + effectiveDelta);

                    // 1. Spellblade Decay
                    setSpellbladeState((prev) => {
                        const nextCd = Math.max(0, prev.cooldownRemaining - effectiveDelta);
                        if (!prev.active) return { ...prev, cooldownRemaining: nextCd };
                        const nextDur = prev.durationRemaining - effectiveDelta;
                        return nextDur <= 0
                            ? { ...prev, active: false, durationRemaining: 0, cooldownRemaining: nextCd }
                            : { ...prev, durationRemaining: nextDur, cooldownRemaining: nextCd };
                    });

                    // 2. Empower Decay
                    setActiveEmpower((prev) => {
                        if (!prev) return null;
                        const nextDur = prev.durationRemaining - effectiveDelta;
                        return nextDur <= 0 ? null : { ...prev, durationRemaining: nextDur };
                    });

                    // 3. Process Queued Discrete Hits (Multi-Hit without StrictMode duplication)
                    if (queuedHits.length > 0) {
                        const remainingHits: QueuedCombatHit[] = [];
                        const connectingHits: RawLogPayload[] = [];
                        let batchDamage = 0;
                        let furyEarned = 0;

                        for (const hit of queuedHits) {
                            const nextDelay = hit.delayRemaining - effectiveDelta;
                            if (nextDelay <= 0) {
                                batchDamage += hit.damageAmount;
                                connectingHits.push({
                                    source: hit.sourceName,
                                    rawDamage: hit.damageAmount,
                                    effectiveDamage: hit.damageAmount,
                                    damageType: hit.damageType,
                                    isCritical: hit.isCritical,
                                });
                                if (hit.furyGain) furyEarned += hit.furyGain;
                            } else {
                                remainingHits.push({ ...hit, delayRemaining: nextDelay });
                            }
                        }

                        if (batchDamage > 0) {
                            setTargetCurrentHp((currHp) =>
                                Math.max(0, Number((currHp - batchDamage).toFixed(1)))
                            );
                            setOutOfCombatTimer(0);
                        }

                        if (furyEarned > 0 && attackerStats.resourceType === 'fury') {
                            setAttackerResource((f) => Math.min(100, f + furyEarned));
                        }

                        if (connectingHits.length > 0) {
                            onLogBatch(connectingHits);
                        }

                        setQueuedHits(remainingHits);
                    }

                    // 4. DoTs Processing
                    if (activeDots.length > 0) {
                        const { totalDamage, nextDots, triggeredTicks } = processActiveDots(
                            activeDots,
                            effectiveDelta,
                            attackerStats,
                            targetStats,
                            targetHpRef.current
                        );

                        if (totalDamage > 0) {
                            setTargetCurrentHp((prev) => {
                                const after = Math.max(0, prev - totalDamage);
                                return calculateHpRegen(after, targetStats, effectiveDelta);
                            });
                            setOutOfCombatTimer(0);
                        }

                        if (triggeredTicks.length > 0) {
                            onLogBatch(
                                triggeredTicks.map((t) => ({
                                    source: t.sourceName,
                                    rawDamage: t.damageAmount,
                                    effectiveDamage: t.damageAmount,
                                    damageType: t.damageType,
                                }))
                            );
                        }

                        setActiveDots(nextDots);
                    }

                    // 5. Resource Regen & Out of Combat Decay
                    setAttackerResource((prev) =>
                        calculateResourceTick(prev, attackerStats, effectiveDelta, outOfCombatTimer)
                    );
                    setTargetResource((prev) =>
                        calculateResourceTick(prev, targetStats, effectiveDelta, 0)
                    );

                    // 6. Cooldowns & Recasts
                    setCooldowns((prev) => updateCooldowns(prev, effectiveDelta));
                    setRecasts((prev) => {
                        const { nextStates, expiredSkills } = updateRecastWindows(prev, effectiveDelta);
                        if (expiredSkills.length > 0) {
                            setCooldowns((cds) => {
                                const upd = { ...cds };
                                for (const key of expiredSkills) {
                                    const sk = attackerChamp.skills.find((s) => s.key === key);
                                    if (sk?.cooldown) {
                                        const r = skillRanks[key] || 1;
                                        const bCd = sk.cooldown[r - 1] ?? sk.cooldown[0];
                                        upd[key] = calculateActualCooldown(bCd, attackerStats.haste);
                                    }
                                }
                                return upd;
                            });
                        }
                        return nextStates;
                    });

                    // 7. Standard Auto-Attack
                    setAttackCooldownRemaining((prev) => Math.max(0, prev - effectiveDelta));
                    setAttackWindupRemaining((prev) => {
                        if (prev <= 0) return 0;
                        const next = prev - effectiveDelta;
                        if (next <= 0 && pendingAttackRef.current) {
                            const attack = pendingAttackRef.current;
                            setTargetCurrentHp((hp) => Math.max(0, Number((hp - attack.effectiveDamage).toFixed(1))));
                            setOutOfCombatTimer(0);
                            onLogBatch([
                                {
                                    source: attack.spellbladeDamageApplied
                                        ? `Basic Attack + ${attack.spellbladeDamageApplied.itemName}`
                                        : 'Basic Attack',
                                    rawDamage: attack.rawDamage + (attack.spellbladeDamageApplied?.raw ?? 0),
                                    effectiveDamage: attack.effectiveDamage,
                                    damageType: 'physical',
                                    isCritical: attack.isCritical,
                                },
                            ]);

                            if (attackerStats.resourceType === 'fury') {
                                setAttackerResource((fury) => Math.min(100, fury + 5));
                            }
                            pendingAttackRef.current = null;
                        }
                        return Math.max(0, next);
                    });
                }
            }
            lastTimeRef.current = time;
            frameId = requestAnimationFrame(loop);
        };

        frameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameId);
    }, [isPaused, timeScale, attackerStats, targetStats, outOfCombatTimer, skillRanks, activeDots, queuedHits, onLogBatch]);

    const resetCombat = () => {
        setTargetCurrentHp(targetStats.totalHp);
        setCooldowns({ Q: 0, W: 0, E: 0, R: 0 });
        setRecasts({});
        setActiveDots([]);
        setQueuedHits([]);
        setAttackCooldownRemaining(0);
        setAttackWindupRemaining(0);
        pendingAttackRef.current = null;
        setOutOfCombatTimer(0);
        setActiveEmpower(null);
        setSpellbladeState({
            active: false,
            durationRemaining: 0,
            cooldownRemaining: 0,
            sourceItemName: '',
            damageType: 'physical',
            extraDamage: 0,
        });
    };

    return {
        targetCurrentHp,
        setTargetCurrentHp,
        attackerResource,
        setAttackerResource,
        targetResource,
        setTargetResource,
        isPaused,
        setIsPaused,
        timeScale,
        setTimeScale,
        cooldowns,
        setCooldowns,
        recasts,
        setRecasts,
        activeDots,
        setActiveDots,
        queuedHits,
        enqueueHits,
        spellbladeState,
        setSpellbladeState,
        activeEmpower,
        setActiveEmpower,
        attackCooldownRemaining,
        setAttackCooldownRemaining,
        attackWindupRemaining,
        setAttackWindupRemaining,
        pendingAttackRef,
        setOutOfCombatTimer,
        resetCombat,
    };
}