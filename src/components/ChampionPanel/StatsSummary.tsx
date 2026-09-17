import type { ComputedUnitStats } from '../../types/game';

interface StatsSummaryProps {
    stats: ComputedUnitStats;
    variant: 'attacker' | 'target';
}

export function StatsSummary({ stats }: StatsSummaryProps) {
    return (
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Health */}
                <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Health</span>
                    <span className="font-bold text-emerald-400">{stats.totalHp}</span>
                    <span className="text-[10px] text-slate-500 block">Base: {stats.baseHp} (+{stats.bonusHp})</span>
                </div>

                {/* Attack Damage (AD) */}
                <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Attack Damage (AD)</span>
                    <span className="font-bold text-amber-300">{stats.totalAd}</span>
                    <span className="text-[10px] text-amber-400/70 block">Base: {stats.baseAd} (+{stats.bonusAd})</span>
                </div>

                {/* Ability Power (AP) */}
                <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Ability Power (AP)</span>
                    <span className="font-bold text-cyan-400">{stats.ap}</span>
                </div>

                {/* Lethality & Armor Penetration */}
                <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Armor Pen</span>
                    <span className="font-bold text-orange-300">
                        {stats.lethality} leth. | {stats.percentArmorPen}%
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-900">
                {/* Armor */}
                <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Armor</span>
                    <span className="font-bold text-orange-400">{stats.armor}</span>
                </div>

                {/* Magic Resistance */}
                <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Magic Resist</span>
                    <span className="font-bold text-purple-400">{stats.magicResistance}</span>
                </div>

                {/* Magic Penetration */}
                <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Magic Pen</span>
                    <span className="font-bold text-purple-300">
                        {stats.flatMagicPen} flat | {stats.percentMagicPen}%
                    </span>
                </div>
            </div>
        </div>
    );
}