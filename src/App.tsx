import { useState } from 'react';
import { mockAhri } from './data/mockChampions';
import { calculateEffectiveDamage } from './engine/calculator';

export default function App() {
  const [champion] = useState(mockAhri);
  const [skillRanks, setSkillRanks] = useState<Record<string, number>>({
    Q: 1,
  });

  // Atributos do atacante
  const [ap, setAp] = useState(100);
  const [bonusAd, setBonusAd] = useState(0);

  // Atributos do alvo
  const [targetArmor, setTargetArmor] = useState(40);
  const [targetMr, setTargetMr] = useState(40);

  const attackerStats = {
    level: 6,
    baseAd: champion.baseStats.baseAd,
    bonusAd,
    totalAd: champion.baseStats.baseAd + bonusAd,
    ap,
    totalHp: champion.baseStats.hp,
    bonusHp: 0,
  };

  const targetStats = {
    currentHp: 1200,
    maxHp: 1200,
    armor: targetArmor,
    mr: targetMr,
  };

  const handleRankChange = (skillKey: string, rank: number) => {
    setSkillRanks((prev) => ({ ...prev, [skillKey]: rank }));
  };

  return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
        <header className="max-w-4xl w-full mb-8">
          <h1 className="text-3xl font-bold text-amber-400">LoL Damage Engine Test</h1>
          <p className="text-sm text-slate-400">
            Simulador com motor desacoplado e dados em mock.
          </p>
        </header>

        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Painel de Controles */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-200 border-b border-slate-800 pb-2">
                Atacante ({champion.name})
              </h2>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    Poder de Habilidade (AP): <span>{ap}</span>
                  </label>
                  <input
                      type="range"
                      min="0"
                      max="1000"
                      step="5"
                      value={ap}
                      onChange={(e) => setAp(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    Dano de Ataque Bônus (AD): <span>{bonusAd}</span>
                  </label>
                  <input
                      type="range"
                      min="0"
                      max="500"
                      step="5"
                      value={bonusAd}
                      onChange={(e) => setBonusAd(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-200 border-b border-slate-800 pb-2">
                Resistências do Alvo
              </h2>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    Armadura: <span>{targetArmor}</span>
                  </label>
                  <input
                      type="range"
                      min="0"
                      max="300"
                      step="5"
                      value={targetArmor}
                      onChange={(e) => setTargetArmor(Number(e.target.value))}
                      className="w-full accent-orange-400 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 flex justify-between">
                    Resistência Mágica (MR): <span>{targetMr}</span>
                  </label>
                  <input
                      type="range"
                      min="0"
                      max="300"
                      step="5"
                      value={targetMr}
                      onChange={(e) => setTargetMr(Number(e.target.value))}
                      className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Exibição das Habilidades e Dano */}
          <section className="md:col-span-2 space-y-4">
            {champion.skills.map((skill) => {
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

                      {/* Seletor de Rank */}
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

                    {/* Lista de Estágios de Dano */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {skill.stages.map((stage) => {
                        const result = calculateEffectiveDamage(
                            stage,
                            currentRank,
                            attackerStats,
                            targetStats
                        );

                        const badgeColor =
                            stage.damageType === 'magic'
                                ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800'
                                : stage.damageType === 'physical'
                                    ? 'text-orange-400 bg-orange-950/40 border-orange-800'
                                    : 'text-white bg-slate-800 border-slate-600';

                        return (
                            <div
                                key={stage.id}
                                className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg space-y-2"
                            >
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-medium text-slate-300">{stage.name}</span>
                                <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase font-bold ${badgeColor}`}>
                            {stage.damageType}
                          </span>
                              </div>

                              <div className="flex justify-between items-baseline pt-1">
                          <span className="text-xs text-slate-500">
                            Bruto: <span className="text-slate-300 font-mono">{result.rawDamage}</span>
                          </span>
                                <div className="text-right">
                                  <span className="text-xs text-slate-400 mr-1">Efetivo:</span>
                                  <span className="text-xl font-bold font-mono text-emerald-400">
                              {result.postMitigationDamage}
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
      </div>
  );
}