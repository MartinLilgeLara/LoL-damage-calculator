import type { Champion, ComputedUnitStats, Item } from '../../types/game';
import { StatsSummary } from './StatsSummary';
import { ItemSlots } from './ItemSlots';

interface ChampionPanelProps {
    role: 'attacker' | 'target';
    selectedChampionId: string;
    level: number;
    items: (Item | null)[];
    computedStats: ComputedUnitStats;
    availableChampions: Champion[];
    availableItems: Item[];
    onChampionChange: (championId: string) => void;
    onLevelChange: (level: number) => void;
    onItemChange: (slotIndex: number, itemId: string) => void;
}

export function ChampionPanel({
                                  role,
                                  selectedChampionId,
                                  level,
                                  items,
                                  computedStats,
                                  availableChampions,
                                  availableItems,
                                  onChampionChange,
                                  onLevelChange,
                                  onItemChange,
                              }: ChampionPanelProps) {
    const isAttacker = role === 'attacker';
    const titleColor = isAttacker ? 'text-amber-400' : 'text-red-400';
    const accentColor = isAttacker ? 'accent-amber-500' : 'accent-red-500';

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className={`text-lg font-semibold ${titleColor}`}>
                    {isAttacker ? 'Attacker' : 'Target'}
                </h2>
                <select
                    value={selectedChampionId}
                    onChange={(e) => onChampionChange(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-sm rounded px-2.5 py-1 focus:outline-none"
                >
                    {availableChampions.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label className="text-xs text-slate-400 flex justify-between">
                    Nível: <span className={`font-mono font-bold ${titleColor}`}>{level}</span>
                </label>
                <input
                    type="range"
                    min="1"
                    max="18"
                    value={level}
                    onChange={(e) => onLevelChange(Number(e.target.value))}
                    className={`w-full ${accentColor} cursor-pointer`}
                />
            </div>

            <StatsSummary stats={computedStats} variant={role} />

            <ItemSlots
                items={items}
                availableItems={availableItems}
                onItemChange={onItemChange}
            />
        </section>
    );
}