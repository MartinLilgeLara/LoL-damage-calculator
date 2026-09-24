import { useState, useEffect, useRef } from 'react';
import { mitigateDamage } from './engine/mitigation';
import { mockChampions } from './data/mockChampions';
import { mockItems } from './data/mockItems';
import { computeUnitStats } from './engine/calculator';
import type { Item,RecastStates,DamageType, ActiveAttackEmpower } from './types/game';
import { ChampionPanel } from './components/ChampionPanel/ChampionPanel';
import { SkillCard } from './components/Skills/SkillCard';
import { ItemPassivesSection } from './components/Items/ItemPassiveSection';
import { HealthBar } from './components/Combat/HealthBar';
import { ResourceBar } from './components/ChampionPanel/ResourceBar';
import { updateRecastWindows } from './engine/gameLoop';
import { CombatControlsBar } from './components/Combat/CombatControlsBar';
import { AutoAttackCard } from './components/Combat/AutoAttackCard';
import { CombatLog, type CombatLogEntry } from './components/Combat/CombatLog';
import {
    calculateAttackTiming,
    calculateAutoAttackDamage,
    getSpellbladePassive,
    type AutoAttackResult,
    type SpellbladeBuff,
} from './engine/autoAttack';
import {
    calculateHpRegen,
    calculateResourceTick,
    updateCooldowns,
    calculateActualCooldown,
    type CombatCooldowns,
    processActiveDots,
    type ActiveDotInstance,
} from './engine/gameLoop';
import { triggerAbilityHitItemDots } from './engine/ItemsCalculator';
import { calculateEffectiveDamage } from './engine/calculator';

export default function App() {
    const [combatLogs, setCombatLogs] = useState<CombatLogEntry[]>([]);

// Função auxiliar para alimentar o log
    const addCombatLog = (
        source: string,
        rawDamage: number,
        effectiveDamage: number,
        damageType: DamageType = 'physical',
        isCritical: boolean = false
    ) => {
        if (effectiveDamage <= 0) return;
        const now = new Date();
        const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);

        const newEntry: CombatLogEntry = {
            id: `${Date.now()}_${Math.random()}`,
            timestamp,
            source,
            rawDamage: Math.round(rawDamage),
            effectiveDamage: Math.round(effectiveDamage),
            damageType,
            isCritical,
        };

        setCombatLogs((prev) => [newEntry, ...prev]); // Mais recentes no topo
    };
    const [spellbladeState, setSpellbladeState] = useState<SpellbladeBuff>({
        active: false,
        durationRemaining: 0,
        cooldownRemaining: 0,
        sourceItemName: '',
        damageType: 'physical',
        extraDamage: 0,
    });

    const [recasts, setRecasts] = useState<RecastStates>({});
    const [attackerChampionId, setAttackerChampionId] = useState<string>(mockChampions[0].id);
    const [attackerLevel, setAttackerLevel] = useState<number>(3);
    const [attackerItems, setAttackerItems] = useState<(Item | null)[]>(Array(6).fill(null));
    const [activeDots, setActiveDots] = useState<ActiveDotInstance[]>([]);
    const [targetChampionId, setTargetChampionId] = useState<string>(mockChampions[1].id);
    const [targetLevel, setTargetLevel] = useState<number>(3);
    const [targetItems, setTargetItems] = useState<(Item | null)[]>(Array(6).fill(null));
    const [activeEmpower, setActiveEmpower] = useState<ActiveAttackEmpower | null>(null);
    const activeEmpowerRef = useRef<ActiveAttackEmpower | null>(null);
    activeEmpowerRef.current = activeEmpower;
    const [skillRanks, setSkillRanks] = useState<Record<string, number>>({ Q: 1, W: 1, E: 1, R: 1 });

    const attackerChamp = mockChampions.find((c) => c.id === attackerChampionId) || mockChampions[0];
    const targetChamp = mockChampions.find((c) => c.id === targetChampionId) || mockChampions[1];

    const attackerStats = computeUnitStats(attackerChamp, attackerLevel, attackerItems);
    const targetStats = computeUnitStats(targetChamp, targetLevel, targetItems);

    // Recursos
    const [attackerResource, setAttackerResource] = useState<number>(0);
    const [targetResource, setTargetResource] = useState<number>(0);

    // Vida
    const [targetCurrentHp, setTargetCurrentHp] = useState<number>(targetStats.totalHp);

    // Cooldowns ativos do atacante
    const [cooldowns, setCooldowns] = useState<CombatCooldowns>({ Q: 0, W: 0, E: 0, R: 0 });

    // Estado do Game Loop
    const [timeScale, setTimeScale] = useState<number>(1.0); // 0 = Pausado, 0.5, 1, 2
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [attackerOutOfCombatTimer, setAttackerOutOfCombatTimer] = useState<number>(0);
    const targetHpRef = useRef<number>(targetCurrentHp);
    targetHpRef.current = targetCurrentHp;
    const [attackCooldownRemaining, setAttackCooldownRemaining] = useState<number>(0);
    const [attackWindupRemaining, setAttackWindupRemaining] = useState<number>(0);
    const [pendingAttack, setPendingAttack] = useState<AutoAttackResult | null>(null);
    const pendingAttackRef = useRef<AutoAttackResult | null>(null);
    pendingAttackRef.current = pendingAttack;
    // Sincronização inicial de HP e Recursos ao trocar stats
    useEffect(() => {
        setAttackerResource(attackerStats.resourceType === 'fury' ? 0 : attackerStats.maxResource);
        setCooldowns({ Q: 0, W: 0, E: 0, R: 0 });
        setAttackerOutOfCombatTimer(0);
    }, [attackerChampionId, attackerStats.maxResource, attackerStats.resourceType]);

    useEffect(() => {
        setTargetResource(targetStats.resourceType === 'fury' ? 0 : targetStats.maxResource);
        setTargetCurrentHp(targetStats.totalHp);
    }, [targetChampionId, targetStats.maxResource, targetStats.resourceType, targetStats.totalHp]);

    // Ref para rastrear o tempo do último frame
    const lastTimeRef = useRef<number | null>(null);

    // MOTOR DO GAME LOOP (requestAnimationFrame)
    useEffect(() => {
        let animationFrameId: number;

        const loop = (time: number) => {
            if (lastTimeRef.current !== null) {
                const rawDelta = (time - lastTimeRef.current) / 1000;
                const safeDelta = Math.min(rawDelta, 0.1);
                const effectiveDelta = isPaused ? 0 : safeDelta * timeScale;

                if (effectiveDelta > 0) {
                    setAttackerOutOfCombatTimer((prev) => prev + effectiveDelta);
                    setSpellbladeState((prev) => {
                        const nextCd = Math.max(0, prev.cooldownRemaining - effectiveDelta);

                        if (!prev.active) {
                            return { ...prev, cooldownRemaining: nextCd };
                        }

                        const nextDuration = prev.durationRemaining - effectiveDelta;
                        if (nextDuration <= 0) {
                            // Buff expirou sem que o ataque fosse realizado
                            return {
                                ...prev,
                                active: false,
                                durationRemaining: 0,
                                cooldownRemaining: nextCd,
                            };
                        }

                        return {
                            ...prev,
                            durationRemaining: nextDuration,
                            cooldownRemaining: nextCd,
                        };
                    });
                    // Decaimento de habilidade empoderada (expira se passar de 6s sem bater)
                    setActiveEmpower((prev) => {
                        if (!prev) return null;
                        const nextDur = prev.durationRemaining - effectiveDelta;
                        return nextDur <= 0 ? null : { ...prev, durationRemaining: nextDur };
                    });
                    // 1. Processa DoTs usando a ref de HP mais recente
                    let frameDotDamage = 0;
                    setActiveDots((prevDots) => {
                        if (prevDots.length === 0) return prevDots;

                        const { totalDamage, nextDots } = processActiveDots(
                            prevDots,
                            effectiveDelta,
                            attackerStats,
                            targetStats,
                            targetHpRef.current
                        );

                        frameDotDamage = totalDamage;
                        return nextDots;
                    });

                    // 2. Atualização atômica de HP
                    setTargetCurrentHp((prevHp) => {
                        const afterDot = Math.max(0, prevHp - frameDotDamage);
                        return calculateHpRegen(afterDot, targetStats, effectiveDelta);
                    });

                    if (frameDotDamage > 0) {
                        setAttackerOutOfCombatTimer(0);
                        addCombatLog('DoT / Burn Tick', frameDotDamage, frameDotDamage, 'magic');
                    }

                    // 3. Recursos
                    setAttackerResource((prev) =>
                        calculateResourceTick(prev, attackerStats, effectiveDelta, attackerOutOfCombatTimer)
                    );
                    setTargetResource((prev) =>
                        calculateResourceTick(prev, targetStats, effectiveDelta, 0)
                    );

                    // 4. Cooldowns e Recasts
                    setCooldowns((prev) => updateCooldowns(prev, effectiveDelta));
                    setRecasts((prev) => {
                        const { nextStates, expiredSkills } = updateRecastWindows(prev, effectiveDelta);

                        if (expiredSkills.length > 0) {
                            setCooldowns((cds) => {
                                const updated = { ...cds };
                                for (const skillKey of expiredSkills) {
                                    const skill = attackerChamp.skills.find((s) => s.key === skillKey);
                                    if (skill?.cooldown) {
                                        const rank = skillRanks[skillKey] || 1;
                                        const baseCd = skill.cooldown[rank - 1] ?? skill.cooldown[0];
                                        updated[skillKey] = calculateActualCooldown(baseCd, attackerStats.haste);
                                    }
                                }
                                return updated;
                            });
                        }

                        return nextStates;
                    });
                    // 5. Motor de Auto-Ataque (Windup & Attack Cooldown)
                    setAttackCooldownRemaining((prev) => Math.max(0, prev - effectiveDelta));

                    setAttackWindupRemaining((prevWindup) => {
                        if (prevWindup <= 0) return 0;
                        const nextWindup = prevWindup - effectiveDelta;

                        // Se o windup terminou neste frame, consome o ataque da ref
                        if (nextWindup <= 0 && pendingAttackRef.current) {
                            const attack = pendingAttackRef.current;

                            setTargetCurrentHp((currHp) =>
                                Math.max(0, Number((currHp - attack.effectiveDamage).toFixed(1)))
                            );
                            setAttackerOutOfCombatTimer(0);
                            addCombatLog(
                                attack.spellbladeDamageApplied
                                    ? `Basic Attack + ${attack.spellbladeDamageApplied.itemName}`
                                    : 'Basic Attack',
                                attack.rawDamage + (attack.spellbladeDamageApplied?.raw ?? 0),
                                attack.effectiveDamage,
                                'physical',
                                attack.isCritical
                            );

                            if (attackerStats.resourceType === 'fury') {
                                setAttackerResource((fury) => Math.min(100, fury + 5));
                            }

                            pendingAttackRef.current = null;
                            setPendingAttack(null);
                        }

                        return Math.max(0, nextWindup);
                    });
                }
            }
            lastTimeRef.current = time;
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPaused, timeScale, attackerStats, targetStats]);

    // Aplica dano, gasta fúria e reinicia o contador fora de combate
    const handleApplyDamage = (damageAmount: number, furyCost: number = 0, skillKey?: string) => {
        let totalDamage = damageAmount;
        let spellbladeConsumed = false;

        if (skillKey) {
            const skill = attackerChamp.skills.find((s) => s.key === skillKey);
            if (!skill) return;

            // 1. MECÂNICA DE ATTACK RESET (ex: W do Renekton)
            if (skill.resetsAttackTimer) {
                setAttackCooldownRemaining(0);
                setAttackWindupRemaining(0);
                pendingAttackRef.current = null;
                setPendingAttack(null);
            }

            // 2. MECÂNICA DE ON-HIT / SPELLBLADE NA SKILL
            if (skill.appliesOnHit && spellbladeState.active && spellbladeState.extraDamage > 0) {
                const extraMit = mitigateDamage(
                    spellbladeState.extraDamage,
                    spellbladeState.damageType,
                    attackerStats,
                    targetStats
                );
                totalDamage += extraMit.effectiveDamage;
                spellbladeConsumed = true;

                // Desativa o buff consumido
                setSpellbladeState((prev) => ({ ...prev, active: false, durationRemaining: 0 }));
            }

            // 3. ATIVAÇÃO DE NOVO SPELLBLADE (caso não tenha acabado de consumir neste mesmo cast)
            const spellbladeInfo = getSpellbladePassive(attackerItems, attackerStats);
            if (spellbladeInfo && spellbladeState.cooldownRemaining <= 0 && !spellbladeConsumed) {
                setSpellbladeState({
                    active: true,
                    durationRemaining: 10.0,
                    cooldownRemaining: spellbladeInfo.cooldown,
                    sourceItemName: spellbladeInfo.itemName,
                    damageType: spellbladeInfo.damageType,
                    extraDamage: spellbladeInfo.rawExtra,
                });
            }

            // 4. HABILIDADES QUE EMPODERAM O PRÓXIMO ATAQUE (W do Renekton, Q do Garen)
            if (skill.empowersNextAttack) {
                const rank = skillRanks[skillKey] || 1;
                const newEmpower: ActiveAttackEmpower = {
                    skillKey: skill.key as 'Q' | 'W' | 'E' | 'R',
                    skillName: skill.name,
                    rank,
                    furyCost,
                    durationRemaining: 6.0, // Janela de 6s para desferir o golpe
                };
                activeEmpowerRef.current = newEmpower;
                setActiveEmpower(newEmpower);

                // Coloca a habilidade imediatamente em recarga
                if (skill.cooldown) {
                    const baseCd = skill.cooldown[rank - 1] ?? skill.cooldown[0];
                    const realCd = calculateActualCooldown(baseCd, attackerStats.haste);
                    setCooldowns((prev) => ({ ...prev, [skillKey]: realCd }));
                }

                addCombatLog(
                    `${attackerChamp.name} (${skillKey}) - Buff Armado`,
                    0,
                    0,
                    'physical',
                    false
                );
                return; // <-- A chave que faltava fechando o bloco e retornando
            }

            // 5. REGISTRO NO COMBAT LOG PARA SKILLS DIRETAS
            const logLabel = spellbladeConsumed
                ? `${attackerChamp.name} (${skillKey}) + ${spellbladeState.sourceItemName}`
                : `${attackerChamp.name} (${skillKey}) - ${skill.name}`;

            addCombatLog(
                logLabel,
                damageAmount + (spellbladeConsumed ? spellbladeState.extraDamage : 0),
                totalDamage,
                skill.stages[0]?.damageType ?? 'physical'
            );

            const rank = skillRanks[skillKey] || 1;

            // 6. DoT nativo da Habilidade (ex: R do Renekton)
            const dotStages = skill.stages.filter((s) => s.isOverTime === true);
            const nativeSkillDots: ActiveDotInstance[] = dotStages.map((stage) => ({
                id: stage.id,
                sourceName: skill.name,
                stage,
                rank,
                durationRemaining: stage.durationSeconds ?? 5,
                tickInterval: stage.tickInterval ?? 1.0,
                timeUntilNextTick: stage.tickInterval ?? 1.0,
            }));

            // 7. DoTs de Itens ativados por habilidades (ex: Liandry)
            const itemDots = triggerAbilityHitItemDots(attackerItems);
            const allIncomingDots = [...nativeSkillDots, ...itemDots];

            if (allIncomingDots.length > 0) {
                setActiveDots((prev) => {
                    const filtered = prev.filter(
                        (d) => !allIncomingDots.some((incoming) => incoming.id === d.id)
                    );
                    return [...filtered, ...allIncomingDots];
                });
            }

            // 8. Sistema de Recast e Cooldowns
            const maxCasts = skill.maxCasts ?? 1;
            const activeRecast = recasts[skillKey];
            const currentCast = activeRecast ? activeRecast.currentCast : 1;

            if (currentCast < maxCasts && skill.recastWindow) {
                setRecasts((prev) => ({
                    ...prev,
                    [skillKey]: {
                        currentCast: currentCast + 1,
                        windowRemaining: skill.recastWindow!,
                    },
                }));
            } else {
                setRecasts((prev) => {
                    const next = { ...prev };
                    delete next[skillKey];
                    return next;
                });

                if (skill.cooldown) {
                    const baseCd = skill.cooldown[rank - 1] ?? skill.cooldown[0];
                    const realCd = calculateActualCooldown(baseCd, attackerStats.haste);
                    setCooldowns((prev) => ({ ...prev, [skillKey]: realCd }));
                }
            }
        }

        // Aplicação de dano na vida e gasto de recurso para magias diretas
        if (totalDamage > 0) {
            setTargetCurrentHp((prev) => Math.max(0, Number((prev - totalDamage).toFixed(1))));
            setAttackerOutOfCombatTimer(0);
        }

        if (furyCost > 0) {
            setAttackerResource((prev) => Math.max(0, prev - furyCost));
        }
    };
    const handleResetCombat = () => {
        handleResetHp();
        handleResetCooldowns();
        setActiveDots([]);
        setAttackerOutOfCombatTimer(0);
        setCombatLogs([]);
    };
        const handleTriggerAutoAttack = () => {
            if (attackCooldownRemaining > 0 || attackWindupRemaining > 0) return;

            const timing = calculateAttackTiming(attackerStats.atkSpeed);
            let attackResult = calculateAutoAttackDamage(attackerStats, targetStats, spellbladeState);

            const currentEmpower = activeEmpowerRef.current;

            // Se houver um W do Renekton ou Q do Garen armado:
            if (currentEmpower) {
                const skill = attackerChamp.skills.find((s) => s.key === currentEmpower.skillKey);
                if (skill) {
                    const isFuryUser = attackerStats.resourceType === 'fury';
                    const hasEmpoweredFury = isFuryUser && currentEmpower.furyCost > 0;

                    // Seleciona os estágios da habilidade
                    const activeStages = skill.stages.filter((stage) => {
                        const hasEmpoweredStages = skill.stages.some((s) => s.isEmpowered === true);
                        if (!hasEmpoweredStages) return true;
                        return hasEmpoweredFury ? stage.isEmpowered === true : stage.isEmpowered !== true;
                    });

                    // Soma o dano de todas as fatias do golpe (ex: os 2 ou 3 hits do W do Renekton)
                    let skillDamageRaw = 0;
                    let skillDamageEffective = 0;

                    for (const stage of activeStages) {
                        const res = calculateEffectiveDamage(
                            stage,
                            currentEmpower.rank,
                            attackerStats,
                            targetStats,
                            targetCurrentHp
                        );
                        skillDamageRaw += res.rawDamage;
                        skillDamageEffective += res.effectiveDamage;
                    }

                    // O ataque agora carrega o dano das fatias da habilidade
                    attackResult = {
                        ...attackResult,
                        rawDamage: attackResult.rawDamage + skillDamageRaw,
                        effectiveDamage: attackResult.effectiveDamage + skillDamageEffective,
                    };

                    // Consome a fúria caso a habilidade empoderada exigisse
                    if (currentEmpower.furyCost > 0) {
                        setAttackerResource((prev) => Math.max(0, prev - currentEmpower.furyCost));
                    }

                    // Desativa o buff do ataque empoderado
                    activeEmpowerRef.current = null;
                    setActiveEmpower(null);
                }
            }

            // Se consumiu o Spellblade, desativa o buff imediato
            if (spellbladeState.active) {
                setSpellbladeState((prev) => ({ ...prev, active: false, durationRemaining: 0 }));
            }

            pendingAttackRef.current = attackResult;
            setPendingAttack(attackResult);
            setAttackWindupRemaining(timing.windupTime);
            setAttackCooldownRemaining(timing.cycleTime);
        };
    const handleItemSlotChange = (isAttacker: boolean, slotIndex: number, itemId: string) => {
        const item = mockItems.find((i) => i.id === itemId) || null;
        if (isAttacker) {
            const next = [...attackerItems];
            next[slotIndex] = item;
            setAttackerItems(next);
        } else {
            const next = [...targetItems];
            next[slotIndex] = item;
            setTargetItems(next);
        }
    };
    const handleResetCooldowns = () => {
        setCooldowns({ Q: 0, W: 0, E: 0, R: 0 });
        setRecasts({});
        setAttackCooldownRemaining(0);
        setAttackWindupRemaining(0);
        pendingAttackRef.current = null;
        setPendingAttack(null);
        setSpellbladeState({
            active: false,
            durationRemaining: 0,
            cooldownRemaining: 0,
            sourceItemName: '',
            damageType: 'physical',
            extraDamage: 0,
        });
    };

    const handleResetHp = () => {
        setTargetCurrentHp(targetStats.totalHp);
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
                isPaused={isPaused}
                timeScale={timeScale}
                onTogglePause={() => setIsPaused(!isPaused)}
                onTimeScaleChange={(speed) => {
                    setTimeScale(speed);
                    setIsPaused(false);
                }}
                onResetCooldowns={handleResetCooldowns}
                onResetHp={handleResetHp}
                onResetAll={handleResetCombat}
            />

            {/* Grid Principal: Painéis + Barras de Recurso */}
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
                        onItemChange={(idx, id) => handleItemSlotChange(true, idx, id)}
                    />
                    <ResourceBar
                        resourceType={attackerStats.resourceType}
                        currentValue={attackerResource}
                        maxValue={attackerStats.maxResource}
                        onChange={setAttackerResource}
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
                        onItemChange={(idx, id) => handleItemSlotChange(false, idx, id)}
                    />
                    <ResourceBar
                        resourceType={targetStats.resourceType}
                        currentValue={targetResource}
                        maxValue={targetStats.maxResource}
                        onChange={setTargetResource}
                    />
                </div>
            </div>

            {/* Barra de Vida do Alvo */}
            <div className="max-w-6xl w-full">
                <HealthBar
                    currentHp={targetCurrentHp}
                    maxHp={targetStats.totalHp}
                    onReset={() => setTargetCurrentHp(targetStats.totalHp)}
                />
            </div>
            {/* [NOVO] Painel de Histórico de Dano (Combat Log) */}
            <CombatLog
                entries={combatLogs}
                onClear={() => setCombatLogs([])}
            />
            {activeDots.length > 0 && (
                <div className="max-w-6xl w-full flex flex-wrap gap-2">
                    {activeDots.map((dot) => (
                        <div
                            key={dot.id}
                            className="bg-amber-950/40 border border-amber-800/80 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs"
                        >
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span className="text-amber-200 font-bold">{dot.sourceName} ativo:</span>
                            <span className="font-mono text-amber-400 font-bold">
                                {dot.durationRemaining.toFixed(1)}s restantes
                            </span>
                            <span className="text-[10px] text-slate-400">
                                (Tick a cada {dot.tickInterval}s)
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {/* Ações de Combate (Auto-Ataque + Skills) */}
            <section className="max-w-6xl w-full space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-200">Combat Actions ({attackerChamp.name})</h3>
                    <div className="text-xs font-mono text-slate-400">
                        Attack Speed: <span className="text-amber-400 font-bold">{attackerStats.atkSpeed.toFixed(3)}</span> |
                        Crit: <span className="text-red-400 font-bold">{attackerStats.critChance}%</span> ({attackerStats.critDamage}%)
                    </div>
                </div>

                {/* [AQUI ENTRA O AUTO-ATTACK CARD]: */}
                <AutoAttackCard
                    attackerStats={attackerStats}
                    targetStats={targetStats}
                    attackWindupRemaining={attackWindupRemaining}
                    attackCooldownRemaining={attackCooldownRemaining}
                    spellblade={spellbladeState}
                    onAttack={handleTriggerAutoAttack}
                />

                {/* Lista de Habilidades */}
                {attackerChamp.skills.map((skill) => (
                    <SkillCard
                        key={skill.key}
                        skill={skill}
                        currentRank={skillRanks[skill.key] || 1}
                        attackerStats={attackerStats}
                        targetStats={targetStats}
                        attackerResource={attackerResource}
                        onRankChange={(rank) => setSkillRanks((prev) => ({ ...prev, [skill.key]: rank }))}
                        onCast={(dmg, fury) => handleApplyDamage(dmg, fury, skill.key)}
                        targetCurrentHp={targetCurrentHp}
                        cooldownRemaining={cooldowns[skill.key] || 0}
                        currentCast={recasts[skill.key]?.currentCast || 1}
                        recastWindowRemaining={recasts[skill.key]?.windowRemaining || 0}
                        isEmpowerActive={activeEmpower?.skillKey === skill.key}
                    />
                ))}
            </section>

            {/* Passivas de Dano de Itens */}
            <ItemPassivesSection
                items={attackerItems}
                attackerStats={attackerStats}
                targetStats={targetStats}
            />
        </div>
    );
}