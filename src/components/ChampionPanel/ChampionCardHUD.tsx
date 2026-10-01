import { useState } from 'react';
import type { Champion, ComputedUnitStats, Item, ResourceType } from '../../types/game';
import { ItemSlots } from './ItemSlots';

interface ChampionCardHUDProps {
    role: 'attacker' | 'target';
    champion: Champion;
    level: number;
    items: (Item | null)[];
    stats: ComputedUnitStats;
    currentHp: number;
    maxHp: number;
    currentResource: number;
    maxResource: number;
    resourceType: ResourceType;
    availableChampions: Champion[];
    availableItems: Item[];
    onChampionChange: (championId: string) => void;
    onLevelChange: (level: number) => void;
    onItemChange: (slotIndex: number, itemId: string) => void;
    onResourceChange?: (value: number) => void;
    onHpChange?: (value: number) => void;
}

export function ChampionCardHUD({
                                    role,
                                    champion,
                                    level,
                                    items,
                                    stats,
                                    currentHp,
                                    maxHp,
                                    currentResource,
                                    maxResource,
                                    resourceType,
                                    availableChampions,
                                    availableItems,
                                    onChampionChange,
                                    onLevelChange,
                                    onItemChange,
                                    onResourceChange,
                                    onHpChange, // <-- Adicionado aqui na desestruturação
                                }: ChampionCardHUDProps) {
    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    const isAttacker = role === 'attacker';
    const isTarget = !isAttacker;

    const safeHp = Math.max(0, Math.min(currentHp, maxHp));
    const hpPercent = maxHp > 0 ? (safeHp / maxHp) * 100 : 0;

    const isFury = resourceType === 'fury';
    const resourcePercent = maxResource > 0 ? Math.min(100, Math.max(0, (currentResource / maxResource) * 100)) : 0;
    const resourceColor = isFury
        ? currentResource >= 50
            ? 'from-red-600 to-amber-500'
            : 'from-amber-700 to-amber-600'
        : 'from-blue-600 to-cyan-500';

    return (
        <div
            className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col gap-4 text-left shadow-2xl relative backdrop-blur-md transition-all ${
                isAttacker
                    ? 'border-amber-500/40 shadow-amber-500/5'
                    : 'border-red-500/40 shadow-red-500/5'
            }`}
        >
            {/* Header: Selector, Level Slider & Expand Button */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                    <span
                        className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isAttacker
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                    >
                        {isAttacker ? 'Attacker' : 'Target'}
                    </span>
                    <select
                        value={champion.id}
                        onChange={(e) => onChampionChange(e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-100 font-bold text-sm rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                    >
                        {availableChampions.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">
                            Lv. <strong className="text-slate-100 font-bold">{level}</strong>
                        </span>
                        <input
                            type="range"
                            min="1"
                            max="18"
                            value={level}
                            onChange={(e) => onLevelChange(Number(e.target.value))}
                            className={`w-20 h-1.5 rounded cursor-pointer ${
                                isAttacker ? 'accent-amber-500' : 'accent-red-500'
                            }`}
                        />
                    </div>

                    {/* Expand All Stats Button */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded((prev) => !prev)}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isExpanded
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-slate-700'
                        }`}
                        title="Toggle Full Stats Breakdown"
                    >
                        <span>Stats</span>
                        <span className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    </button>
                </div>
            </div>

            {/* Core Body: Mirrored Splash Portrait & Stats Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-12 gap-4 items-center ${isTarget ? 'sm:flex-row-reverse' : ''}`}>
                {/* Champion Vertical Loading Art */}
                <div
                    className={`sm:col-span-4 relative h-56 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner group ${
                        isTarget ? 'sm:order-2' : 'sm:order-1'
                    }`}
                >
                    {champion.loadingUrl ? (
                        <img
                            src={champion.loadingUrl}
                            alt={champion.name}
                            className={`w-full h-full object-cover object-top transition duration-500 group-hover:scale-105 ${
                                isTarget ? 'scale-x-[-1]' : ''
                            }`}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                            No Splash Art
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
                    <span className="absolute bottom-2 left-2 right-2 text-center text-xs font-bold text-slate-200 truncate drop-shadow-md">
                        {champion.name}
                    </span>
                </div>

                {/* Stats & Items */}
                <div className={`sm:col-span-8 flex flex-col gap-3 ${isTarget ? 'sm:order-1' : 'sm:order-2'}`}>
                    {/* Compact HUD Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                        <div>
                            <span className="text-[10px] text-slate-500 block">AD</span>
                            <span className="font-bold text-amber-300">{stats.totalAd}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block">AP</span>
                            <span className="font-bold text-cyan-400">{stats.ap}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block">ARMOR</span>
                            <span className="font-bold text-orange-400">{stats.armor}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block">MR</span>
                            <span className="font-bold text-purple-400">{stats.magicResistance}</span>
                        </div>

                        <div>
                            <span className="text-[10px] text-slate-500 block">AS</span>
                            <span className="font-bold text-amber-200">{stats.atkSpeed.toFixed(3)}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block">HASTE</span>
                            <span className="font-bold text-sky-400">{stats.haste}</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block">CRIT</span>
                            <span className="font-bold text-red-400">{stats.critChance}%</span>
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-500 block">LETH.</span>
                            <span className="font-bold text-orange-300">{stats.lethality}</span>
                        </div>
                    </div>

                    {/* Inventory (6 Slots) */}
                    <ItemSlots
                        side={isAttacker ? 'left' : 'right'}
                        items={items}
                        availableItems={availableItems}
                        onItemChange={onItemChange}
                    />
                </div>
            </div>

            {/* EXPANDABLE FULL STATS DRAWER */}
            {isExpanded && (
                <div className="bg-slate-950 border border-slate-800/90 rounded-xl p-3.5 space-y-3 font-mono text-xs animate-in fade-in duration-200">
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                        <span className="text-[11px] font-bold uppercase text-slate-400">Complete Unit Statistics</span>
                        <span className="text-[10px] text-slate-500">Live Calculated</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Offense */}
                        <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-[10px] uppercase font-bold text-amber-400 block border-b border-slate-800 pb-1">
                                Offense
                            </span>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Base AD:</span>
                                <span className="text-slate-200">{stats.baseAd}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Bonus AD:</span>
                                <span className="text-amber-400 font-bold">+{stats.bonusAd}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Crit Damage:</span>
                                <span className="text-slate-200">{stats.critDamage}%</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Armor Pen:</span>
                                <span className="text-slate-200">{stats.percentArmorPen}%</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Flat Magic Pen:</span>
                                <span className="text-purple-300">{stats.flatMagicPen}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Magic Pen %:</span>
                                <span className="text-purple-300">{stats.percentMagicPen}%</span>
                            </div>
                        </div>

                        {/* Defense & Resistances */}
                        <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-[10px] uppercase font-bold text-orange-400 block border-b border-slate-800 pb-1">
                                Defense
                            </span>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Base HP:</span>
                                <span className="text-slate-200">{stats.baseHp}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Bonus HP:</span>
                                <span className="text-emerald-400 font-bold">+{stats.bonusHp}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">HP Regen (HP5):</span>
                                <span className="text-emerald-300">{(stats.hpRegen).toFixed(1)} / 5s</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Tenacity:</span>
                                <span className="text-slate-200">{stats.tenacity}%</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Move Speed:</span>
                                <span className="text-slate-200">{stats.movementSpeed}</span>
                            </div>
                        </div>

                        {/* Sustain & Utility */}
                        <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                            <span className="text-[10px] uppercase font-bold text-cyan-400 block border-b border-slate-800 pb-1">
                                Sustain & Utility
                            </span>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Resource Regen:</span>
                                <span className="text-cyan-300">
                                    {stats.resourceType === 'mana' ? `${stats.resourceRegen} / 5s` : '0'}
                                </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Life Steal:</span>
                                <span className="text-red-300">{stats.lifesteal}%</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Omnivamp:</span>
                                <span className="text-rose-400 font-bold">{stats.omnivamp}%</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Heal & Shield:</span>
                                <span className="text-emerald-400 font-bold">+{stats.healAndShieldPower}%</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-slate-400">Ability Haste:</span>
                                <span className="text-sky-300">{stats.haste}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Health Bar with Dynamic Markers (100 HP / 1000 HP) */}
            <div className="space-y-1">
                <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-slate-400 font-semibold">Health</span>
                    <span className="font-bold text-emerald-400">
                        {Math.ceil(safeHp)} <span className="text-slate-500">/ {maxHp}</span>
                    </span>
                </div>
                <div className="relative w-full h-5 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                    {/* Vida Preenchida - Sem atraso de transition para acompanhar o slider e ticks perfeitamente */}
                    <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, Math.max(0, hpPercent))}%` }}
                    />

                    {/* Marcadores de 100 de HP */}
                    {maxHp <= 10000 &&
                        Array.from({ length: Math.floor(maxHp / 100) }).map((_, i) => {
                            const hpThreshold = (i + 1) * 100;
                            if (hpThreshold % 1000 === 0) return null;
                            const leftPercent = (hpThreshold / maxHp) * 100;
                            return (
                                <div
                                    key={`tick_100_${i}`}
                                    className="absolute top-0 bottom-0 w-[1px] bg-black/45 pointer-events-none"
                                    style={{ left: `${leftPercent}%` }}
                                />
                            );
                        })}

                    {/* Marcadores de 1000 de HP */}
                    {Array.from({ length: Math.floor(maxHp / 1000) }).map((_, i) => {
                        const leftPercent = (((i + 1) * 1000) / maxHp) * 100;
                        return (
                            <div
                                key={`tick_1000_${i}`}
                                className="absolute top-0 bottom-0 w-[2px] bg-black/85 pointer-events-none"
                                style={{ left: `${leftPercent}%` }}
                            />
                        );
                    })}
                </div>

                {/* Slider de Vida */}
                {onHpChange && (
                    <div className="flex items-center gap-2 pt-0.5">
                        <input
                            type="range"
                            min="0"
                            max={maxHp}
                            step="1"
                            value={Math.round(safeHp)}
                            onChange={(e) => onHpChange(Number(e.target.value))}
                            className={`w-full h-1 bg-slate-800 rounded cursor-pointer ${
                                isAttacker ? 'accent-emerald-500' : 'accent-emerald-400'
                            }`}
                            title="Drag to test damage and HP regeneration"
                        />
                    </div>
                )}
            </div>

            {/* Resource Bar (Mana / Fury) */}
            {resourceType !== 'none' && maxResource > 0 && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-slate-400 font-semibold capitalize">
                            {isFury ? 'Fury' : 'Mana'}
                        </span>
                        <span className={`font-bold ${isFury && currentResource >= 50 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {Math.round(currentResource)} <span className="text-slate-500">/ {maxResource}</span>
                        </span>
                    </div>
                    <div className="relative w-full h-3 bg-slate-950 rounded-md border border-slate-800 overflow-hidden">
                        {/* Preenchimento imediato sem transition atrasando o slider */}
                        <div
                            className={`h-full bg-gradient-to-r ${resourceColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, resourcePercent))}%` }}
                        />
                        {isFury && (
                            <div className="absolute top-0 bottom-0 w-[2px] bg-white/70 pointer-events-none left-1/2" />
                        )}
                    </div>
                    {onResourceChange && (
                        <div className="flex items-center gap-2 pt-0.5">
                            <input
                                type="range"
                                min="0"
                                max={maxResource}
                                step="1"
                                value={Math.round(currentResource)}
                                onChange={(e) => onResourceChange(Number(e.target.value))}
                                className="w-full h-1 bg-slate-800 rounded accent-amber-500 cursor-pointer"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}