import { useState } from 'react';

interface CombatControlsBarProps {
    isPaused: boolean;
    timeScale: number;
    onTogglePause: () => void;
    onTimeScaleChange: (speed: number) => void;
    onResetCooldowns: () => void;
    onResetHp: () => void;
    onResetAll: () => void;
}

export function CombatControlsBar({
                                      isPaused,
                                      timeScale,
                                      onTogglePause,
                                      onTimeScaleChange,
                                      onResetCooldowns,
                                      onResetHp,
                                      onResetAll,
                                  }: CombatControlsBarProps) {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

    // Modo Minimizado: apenas uma pílula compacta no canto
    if (isCollapsed) {
        return (
            <aside className="fixed right-3 top-1/2 -translate-y-1/2 z-50">
                <button
                    type="button"
                    onClick={() => setIsCollapsed(false)}
                    className="p-2.5 bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md cursor-pointer transition-all hover:scale-105 flex flex-col items-center gap-1 font-mono text-[10px] font-bold"
                    title="Expand Simulation Controls"
                >
                    <span>⚙️</span>
                    <span className="text-[9px] uppercase tracking-tighter text-slate-400">HUD</span>
                </button>
            </aside>
        );
    }

    return (
        <aside className="fixed right-3 top-1/2 -translate-y-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2.5 w-36 text-xs transition-all animate-in fade-in zoom-in-95 duration-150">
            {/* Header com botão de minimizar */}
            <div className="flex justify-between items-center w-full border-b border-slate-800 pb-1.5 px-0.5">
                <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-bold truncate">
                    Controls
                </span>
                <button
                    type="button"
                    onClick={() => setIsCollapsed(true)}
                    className="text-slate-500 hover:text-slate-300 px-1 py-0.5 rounded leading-none text-xs cursor-pointer"
                    title="Collapse HUD"
                >
                    —
                </button>
            </div>

            {/* Play / Pause */}
            <button
                type="button"
                onClick={onTogglePause}
                className={`w-full py-1.5 px-2.5 font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                    isPaused
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
            >
                {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>

            {/* Velocidades */}
            <div className="flex w-full bg-slate-950 p-1 rounded-xl border border-slate-800/80 gap-1 justify-between">
                {[0.5, 1.0, 2.0].map((speed) => (
                    <button
                        key={speed}
                        type="button"
                        onClick={() => onTimeScaleChange(speed)}
                        className={`flex-1 py-1 font-mono font-bold text-[10px] rounded-lg transition cursor-pointer text-center ${
                            timeScale === speed && !isPaused
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        {speed}x
                    </button>
                ))}
            </div>

            <div className="w-full h-[1px] bg-slate-800 my-0.5" />

            {/* Reset CDs */}
            <button
                type="button"
                onClick={onResetCooldowns}
                className="w-full py-1 px-2 bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-xl font-bold cursor-pointer transition active:scale-95 text-center text-[11px]"
            >
                ⚡ Reset CDs
            </button>

            {/* Reset Target HP */}
            <button
                type="button"
                onClick={onResetHp}
                className="w-full py-1 px-2 bg-slate-800/90 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold cursor-pointer transition active:scale-95 text-center text-[11px]"
            >
                💚 Reset HP
            </button>

            {/* Reset All */}
            <button
                type="button"
                onClick={onResetAll}
                className="w-full py-1 px-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 rounded-xl font-bold cursor-pointer transition active:scale-95 text-center text-[11px]"
            >
                🔄 Reset All
            </button>
        </aside>
    );
}