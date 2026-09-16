import type { ComputedUnitStats } from '../../types/game';

interface StatsSummaryProps {
    stats: ComputedUnitStats;
    variant: 'attacker' | 'target';
}

export function StatsSummary({ stats, variant }: StatsSummaryProps) {
    if (variant === 'attacker') {
        return (
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                <div>
                    <span className="text-slate-500 block">AD</span>
                    <span className="font-bold text-slate-200">{stats.totalAd}</span>{' '}
                    <span className="text-[10px] text-amber-400">(+{stats.bonusAd})</span>
                </div>
                <div>
                    <span className="text-slate-500 block">AP</span>
                    <span className="font-bold text-cyan-400">{stats.ap}</span>
                </div>
                <div>
                    <span className="text-slate-500 block">Magic penetration</span>
                    <span className="font-bold text-purple-400">
            {stats.flatMagicPen} flat | {stats.percentMagicPen}%
          </span>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
            <div>
                <span className="text-slate-500 block">Max Hp</span>
                <span className="font-bold text-emerald-400">{stats.totalHp}</span>
            </div>
            <div>
                <span className="text-slate-500 block">Armor</span>
                <span className="font-bold text-orange-400">{stats.armor}</span>
            </div>
            <div>
                <span className="text-slate-500 block">Magic Resistance</span>
                <span className="font-bold text-purple-400">{stats.magicResistance}</span>
            </div>
        </div>
    );
}