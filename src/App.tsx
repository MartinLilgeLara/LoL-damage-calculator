import { useState } from 'react';
import { mockChampions, mockItems } from './data/mockChampions';
import { computeUnitStats } from './engine/calculator';
import type { Item } from './types/game';
import { ChampionPanel } from './components/ChampionPanel/ChampionPanel';
import { SkillCard } from './components/Skills/SkillCard';
import { ItemPassivesSection} from "./components/Items/ItemPassiveSection.tsx";

export default function App() {
  // Estado do Atacante
  const [attackerChampionId, setAttackerChampionId] = useState<string>(mockChampions[0].id);
  const [attackerLevel, setAttackerLevel] = useState<number>(6);
  const [attackerItems, setAttackerItems] = useState<(Item | null)[]>(Array(6).fill(null));

  // Estado do Alvo
  const [targetChampionId, setTargetChampionId] = useState<string>(mockChampions[1].id);
  const [targetLevel, setTargetLevel] = useState<number>(6);
  const [targetItems, setTargetItems] = useState<(Item | null)[]>(Array(6).fill(null));

  // Ranks das Habilidades
  const [skillRanks, setSkillRanks] = useState<Record<string, number>>({ Q: 1 });

  // Resoluções de Entidades
  const attackerChamp = mockChampions.find((c) => c.id === attackerChampionId) || mockChampions[0];
  const targetChamp = mockChampions.find((c) => c.id === targetChampionId) || mockChampions[1];

  // Cálculos de Atributos Totais
  const attackerStats = computeUnitStats(attackerChamp, attackerLevel, attackerItems);
  const targetStats = computeUnitStats(targetChamp, targetLevel, targetItems);

  // Manipuladores
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
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
        <header className="max-w-6xl w-full mb-8">
          <h1 className="text-3xl font-bold text-amber-400">LoL Damage Engine Simulator</h1>
          <p className="text-sm text-slate-400">
            Cálculo com mitigação de armadura/MR, escalonamento por nível e slots de itens.
          </p>
        </header>

        {/* Grid Principal: Atacante e Alvo */}
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                  onRankChange={(rank) => handleRankChange(skill.key, rank)}
              />
          ))}
        </section>
        {/* Lista de Habilidades */}
        <section className="max-w-6xl w-full space-y-4">
          {/* ... mapeamento das skills ... */}
        </section>

        {/* Passivas de Dano de Itens */}
        <ItemPassivesSection
            items={attackerItems}
            attackerStats={attackerStats}
            targetStats={targetStats}/>
      </div>
  );
}