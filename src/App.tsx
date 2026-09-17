import { useState, useEffect } from 'react';
import { mockChampions, mockItems } from './data/mockChampions';
import { computeUnitStats } from './engine/calculator';
import type { Item } from './types/game';
import { ChampionPanel } from './components/ChampionPanel/ChampionPanel';
import { SkillCard } from './components/Skills/SkillCard';
import { ItemPassivesSection } from './components/Items/ItemPassiveSection';
import { HealthBar } from './components/Combat/HealthBar';
import { ResourceBar } from './components/ChampionPanel/ResourceBar'; // [NOVO IMPORT]

export default function App() {
    // Atacante
    const [attackerChampionId, setAttackerChampionId] = useState<string>(mockChampions[0].id);
    const [attackerLevel, setAttackerLevel] = useState<number>(3);
    const [attackerItems, setAttackerItems] = useState<(Item | null)[]>(Array(6).fill(null));

    // Alvo
    const [targetChampionId, setTargetChampionId] = useState<string>(mockChampions[1].id);
    const [targetLevel, setTargetLevel] = useState<number>(3);
    const [targetItems, setTargetItems] = useState<(Item | null)[]>(Array(6).fill(null));

    // Ranks
    const [skillRanks, setSkillRanks] = useState<Record<string, number>>({ Q: 1, W: 1, E: 1, R: 1 });

    // Resolução de Entidades e Estatísticas
    const attackerChamp = mockChampions.find((c) => c.id === attackerChampionId) || mockChampions[0];
    const targetChamp = mockChampions.find((c) => c.id === targetChampionId) || mockChampions[1];

    const attackerStats = computeUnitStats(attackerChamp, attackerLevel, attackerItems);
    const targetStats = computeUnitStats(targetChamp, targetLevel, targetItems);

    // [NOVO ESTADO]: Recursos atuais de atacante e alvo
    const [attackerResource, setAttackerResource] = useState<number>(0);
    const [targetResource, setTargetResource] = useState<number>(0);

    // Sincroniza o recurso caso mude o campeão ou os stats máximos
    useEffect(() => {
        setAttackerResource(attackerStats.resourceType === 'fury' ? 0 : attackerStats.maxResource);
    }, [attackerChampionId, attackerStats.maxResource, attackerStats.resourceType]);

    useEffect(() => {
        setTargetResource(targetStats.resourceType === 'fury' ? 0 : targetStats.maxResource);
    }, [targetChampionId, targetStats.maxResource, targetStats.resourceType]);

    // Vida do Alvo
    const [targetCurrentHp, setTargetCurrentHp] = useState<number>(targetStats.totalHp);

    useEffect(() => {
        setTargetCurrentHp(targetStats.totalHp);
    }, [targetStats.totalHp]);

    // [ALTERADO]: Aplica dano e desconta fúria do atacante caso tenha custo
    const handleApplyDamage = (damageAmount: number, furyCost: number = 0) => {
        setTargetCurrentHp((prev) => Math.max(0, prev - damageAmount));
        if (furyCost > 0) {
            setAttackerResource((prev) => Math.max(0, prev - furyCost));
        }
    };

    const handleResetHp = () => {
        setTargetCurrentHp(targetStats.totalHp);
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

    const handleRankChange = (key: string, rank: number) => {
        setSkillRanks((prev) => ({ ...prev, [key]: rank }));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center gap-8">
            <header className="max-w-6xl w-full">
                <h1 className="text-3xl font-bold text-amber-400">LoL Damage Engine Simulator</h1>
                <p className="text-sm text-slate-400">
                    Interactive Combo & Timeline Engine (Renekton vs Garen)
                </p>
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
                    {/* [NOVO]: Barra de Recursos do Atacante */}
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
                    {/* [NOVO]: Barra de Recursos do Alvo */}
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
                    onReset={handleResetHp}
                />
            </div>

            {/* Lista de Habilidades */}
            <section className="max-w-6xl w-full space-y-4">
                <h3 className="text-xl font-bold text-slate-200">Skills ({attackerChamp.name})</h3>
                {attackerChamp.skills.map((skill) => (
                    <SkillCard
                        key={skill.key}
                        skill={skill}
                        currentRank={skillRanks[skill.key] || 1}
                        attackerStats={attackerStats}
                        targetStats={targetStats}
                        attackerResource={attackerResource} // [NOVO]
                        onRankChange={(rank) => handleRankChange(skill.key, rank)}
                        onCast={handleApplyDamage}
                    />
                ))}
            </section>

            {/* Passivas de Dano de Itens */}
            <ItemPassivesSection
                items={attackerItems}
                attackerStats={attackerStats}
                targetStats={targetStats}
                onCast={(dmg) => handleApplyDamage(dmg, 0)}
            />
        </div>
    );
}