import { useState, useEffect, useRef } from 'react';
import { mockChampions, mockItems } from './data/mockChampions';
import { computeUnitStats } from './engine/calculator';
import type { Item,RecastStates } from './types/game';
import { ChampionPanel } from './components/ChampionPanel/ChampionPanel';
import { SkillCard } from './components/Skills/SkillCard';
import { ItemPassivesSection } from './components/Items/ItemPassiveSection';
import { HealthBar } from './components/Combat/HealthBar';
import { ResourceBar } from './components/ChampionPanel/ResourceBar';
import { updateRecastWindows } from './engine/gameLoop';
import {
    calculateHpRegen,
    calculateResourceTick,
    updateCooldowns,
    calculateActualCooldown,
    type CombatCooldowns,
} from './engine/gameLoop';

export default function App() {
    const [recasts, setRecasts] = useState<RecastStates>({});
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
                // Limita saltos de delta ao trocar de aba (máx 0.1s por frame)
                const safeDelta = Math.min(rawDelta, 0.1);
                const effectiveDelta = isPaused ? 0 : safeDelta * timeScale;

                if (effectiveDelta > 0) {
                    // 1. Atualiza temporizador fora de combate (para decaimento de fúria)
                    setAttackerOutOfCombatTimer((prev) => prev + effectiveDelta);

                    // 2. Regeneração contínua de Vida
                    setTargetCurrentHp((prev) => calculateHpRegen(prev, targetStats, effectiveDelta));
                    //setAttackerCurrentHp((prev) => calculateHpRegen(prev, attackerStats, effectiveDelta));

                    // 3. Regeneração ou Decaimento de Recursos
                    setAttackerResource((prev) =>
                        calculateResourceTick(prev, attackerStats, effectiveDelta, attackerOutOfCombatTimer)
                    );
                    setTargetResource((prev) =>
                        calculateResourceTick(prev, targetStats, effectiveDelta, 0)
                    );

                    // 4. Tick de Cooldowns
                    setCooldowns((prev) => updateCooldowns(prev, effectiveDelta));
                    setRecasts((prev) => {
                        const { nextStates, expiredSkills } = updateRecastWindows(prev, effectiveDelta);

                        // Se alguma janela de recast expirou, coloca a skill em cooldown imediatamente
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
                }
            }
            lastTimeRef.current = time;
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPaused, timeScale, attackerStats, targetStats, attackerOutOfCombatTimer]);

    // Aplica dano, gasta fúria e reinicia o contador fora de combate
    const handleApplyDamage = (damageAmount: number, furyCost: number = 0, skillKey?: string) => {
        setTargetCurrentHp((prev) => Math.max(0, Number((prev - damageAmount).toFixed(1))));
        setAttackerOutOfCombatTimer(0);

        if (furyCost > 0) {
            setAttackerResource((prev) => Math.max(0, prev - furyCost));
        }

        if (skillKey) {
            const skill = attackerChamp.skills.find((s) => s.key === skillKey);
            if (!skill) return;

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
                // Último cast da habilidade: limpa o estado de recast e inicia o cooldown total
                setRecasts((prev) => {
                    const next = { ...prev };
                    delete next[skillKey];
                    return next;
                });

                if (skill.cooldown) {
                    const rank = skillRanks[skillKey] || 1;
                    const baseCd = skill.cooldown[rank - 1] ?? skill.cooldown[0];
                    const realCd = calculateActualCooldown(baseCd, attackerStats.haste);
                    setCooldowns((prev) => ({ ...prev, [skillKey]: realCd }));
                }
            }
        }
    };

    const handleResetCombat = () => {
        setTargetCurrentHp(targetStats.totalHp);
        //setAttackerCurrentHp(attackerStats.totalHp);
        setCooldowns({ Q: 0, W: 0, E: 0, R: 0 });
        setAttackerOutOfCombatTimer(0);
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

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center gap-6">
            <header className="max-w-6xl w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-amber-400">LoL Combat Engine Simulator</h1>
                    <p className="text-sm text-slate-400">Real-time Game Loop Simulator (Renekton vs Garen)</p>
                </div>

                {/* Barra de Controle de Tempo e Simulação */}
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setIsPaused(!isPaused)}
                        className={`px-3 py-1 text-xs font-bold rounded cursor-pointer transition ${
                            isPaused ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                    >
                        {isPaused ? '▶ Resume' : '⏸ Pause'}
                    </button>

                    <div className="h-4 w-[1px] bg-slate-700" />

                    {[0.5, 1.0, 2.0].map((speed) => (
                        <button
                            key={speed}
                            type="button"
                            onClick={() => {
                                setTimeScale(speed);
                                setIsPaused(false);
                            }}
                            className={`px-2.5 py-1 text-xs font-mono font-bold rounded cursor-pointer transition ${
                                timeScale === speed && !isPaused
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                    : 'text-slate-400 hover:bg-slate-800'
                            }`}
                        >
                            {speed}x
                        </button>
                    ))}

                    <div className="h-4 w-[1px] bg-slate-700" />

                    <button
                        type="button"
                        onClick={handleResetCombat}
                        className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800 text-xs font-bold rounded cursor-pointer"
                    >
                        Reset All
                    </button>
                </div>
            </header>

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

            {/* Lista de Habilidades com Cooldowns em Tempo Real */}
            <section className="max-w-6xl w-full space-y-4">
                <h3 className="text-xl font-bold text-slate-200">Skills ({attackerChamp.name})</h3>
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