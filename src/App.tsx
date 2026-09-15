import { useState } from 'react';
import { mockChampions, mockItems } from './data/mockChampions';
import { computeUnitStats, calculateEffectiveDamage } from './engine/calculator';
import type {Item} from './types/game';

export default function App() {
  // Estado do atacante
  const [attackerChampionId, setAttackerChampionId] = useState<string>(mockChampions[0].id);
  const [attackerLevel, setAttackerLevel] = useState<number>(6);
  const [attackerItems, setAttackerItems] = useState<(Item | null)[]>(Array(6).fill(null));

  // Estado do alvo
  const [targetChampionId, setTargetChampionId] = useState<string>(mockChampions[1].id);
  const [targetLevel, setTargetLevel] = useState<number>(6);
  const [targetItems, setTargetItems] = useState<(Item | null)[]>(Array(6).fill(null));

  // Ranks das habilidades do atacante
  const [skillRanks, setSkillRanks] = useState<Record<string, number>>({ Q: 1 });

  // Resolução dos campeões selecionados
  const attackerChamp = mockChampions.find((c) => c.id === attackerChampionId) || mockChampions[0];
  const targetChamp = mockChampions.find((c) => c.id === targetChampionId) || mockChampions[1];

  // Cálculo dos status consolidados (base + escalonamento por nível + itens)
  const attackerStats = computeUnitStats(attackerChamp, attackerLevel, attackerItems);
  const targetStats = computeUnitStats(targetChamp, targetLevel, targetItems);

  // Manipuladores de itens
  const handleItemChange = (
      isAttacker: boolean,
      slotIndex: number,
      itemId: string
  ) => {
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
          {/* Painel do Atacante */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-semibold text-amber-400">Atacante</h2>
              <select
                  value={attackerChampionId}
                  onChange={(e) => setAttackerChampionId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-sm rounded px-2.5 py-1 focus:outline-none"
              >
                {mockChampions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 flex justify-between">
                Nível: <span className="font-mono text-amber-300 font-bold">{attackerLevel}</span>
              </label>
              <input
                  type="range"
                  min="1"
                  max="18"
                  value={attackerLevel}
                  onChange={(e) => setAttackerLevel(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Resumo de Stats Atacante */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">AD Total</span>
                <span className="font-bold text-slate-200">{attackerStats.totalAd}</span>{' '}
                <span className="text-[10px] text-amber-400">(+{attackerStats.bonusAd})</span>
              </div>
              <div>
                <span className="text-slate-500 block">AP</span>
                <span className="font-bold text-cyan-400">{attackerStats.ap}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Pen. Mágica</span>
                <span className="font-bold text-purple-400">
                {attackerStats.flatMagicPen} flat | {attackerStats.percentMagicPen}%
              </span>
              </div>
            </div>

            {/* Slots de Itens Atacante */}
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-2">Itens (6 slots)</span>
              <div className="grid grid-cols-3 gap-2">
                {attackerItems.map((item, idx) => (
                    <select
                        key={idx}
                        value={item?.id || ''}
                        onChange={(e) => handleItemChange(true, idx, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-[11px] rounded p-1.5 truncate focus:outline-none"
                    >
                      <option value="">(Vazio)</option>
                      {mockItems.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                      ))}
                    </select>
                ))}
              </div>
            </div>
          </section>

          {/* Painel do Alvo */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-lg font-semibold text-red-400">Alvo</h2>
              <select
                  value={targetChampionId}
                  onChange={(e) => setTargetChampionId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-sm rounded px-2.5 py-1 focus:outline-none"
              >
                {mockChampions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 flex justify-between">
                Nível: <span className="font-mono text-red-300 font-bold">{targetLevel}</span>
              </label>
              <input
                  type="range"
                  min="1"
                  max="18"
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
              />
            </div>

            {/* Resumo de Stats Alvo */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Vida Total</span>
                <span className="font-bold text-emerald-400">{targetStats.totalHp}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Armadura</span>
                <span className="font-bold text-orange-400">{targetStats.armor}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Resist. Mágica</span>
                <span className="font-bold text-purple-400">{targetStats.magicResistance}</span>
              </div>
            </div>

            {/* Slots de Itens Alvo */}
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-2">Itens (6 slots)</span>
              <div className="grid grid-cols-3 gap-2">
                {targetItems.map((item, idx) => (
                    <select
                        key={idx}
                        value={item?.id || ''}
                        onChange={(e) => handleItemChange(false, idx, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-[11px] rounded p-1.5 truncate focus:outline-none"
                    >
                      <option value="">(Vazio)</option>
                      {mockItems.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                      ))}
                    </select>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Lista de Habilidades e Cálculo */}
        <section className="max-w-6xl w-full space-y-4">
          <h3 className="text-xl font-bold text-slate-200">Habilidades ({attackerChamp.name})</h3>

          {attackerChamp.skills.map((skill) => {
            const currentRank = skillRanks[skill.key] || 1;

            return (
                <div
                    key={skill.key}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div>
                  <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded mr-2 border border-amber-500/30">
                    {skill.key}
                  </span>
                      <strong className="text-base text-slate-100">{skill.name}</strong>
                    </div>

                    <div className="flex gap-1">
                      {Array.from({ length: skill.maxRank }, (_, i) => i + 1).map((rank) => (
                          <button
                              key={rank}
                              onClick={() => handleRankChange(skill.key, rank)}
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
                    {skill.stages.map((stage) => {
                      const result = calculateEffectiveDamage(
                          stage,
                          currentRank,
                          attackerStats,
                          targetStats
                      );

                      const badgeColor =
                          result.damageType === 'magic'
                              ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800'
                              : result.damageType === 'physical'
                                  ? 'text-orange-400 bg-orange-950/40 border-orange-800'
                                  : 'text-white bg-slate-800 border-slate-600';

                      const percentLost = ((result.effectiveDamage / targetStats.totalHp) * 100).toFixed(1);

                      return (
                          <div
                              key={stage.id}
                              className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2"
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium text-slate-300">{stage.name}</span>
                              <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold ${badgeColor}`}>
                          {result.damageType}
                        </span>
                            </div>

                            <div className="flex justify-between items-baseline pt-1">
                        <span className="text-xs text-slate-500">
                          Bruto: <span className="text-slate-300 font-mono">{result.rawDamage}</span>
                        </span>
                              <div className="text-right">
                                <span className="text-xs text-slate-400 mr-1">Efetivo:</span>
                                <span className="text-xl font-bold font-mono text-emerald-400">
                            {result.effectiveDamage}
                          </span>
                                <span className="text-[10px] text-slate-500 block">
                            (~{percentLost}% da vida do alvo)
                          </span>
                              </div>
                            </div>
                          </div>
                      );
                    })}
                  </div>
                </div>
            );
          })}
        </section>
      </div>
  );
}