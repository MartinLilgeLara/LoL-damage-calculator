import { useState } from 'react';
import type { Item } from '../../types/game';

interface ItemSlotsProps {
    items: (Item | null)[];
    availableItems: Item[];
    onItemChange: (slotIndex: number, itemId: string) => void;
}

export function ItemSlots({ items, availableItems, onItemChange }: ItemSlotsProps) {
    // Guarda o índice do slot que está sendo editado (0 a 5) ou null se o modal estiver fechado
    const [activeSlot, setActiveSlot] = useState<number | null>(null);

    const handleSelectItem = (itemId: string) => {
        if (activeSlot !== null) {
            onItemChange(activeSlot, itemId);
            setActiveSlot(null);
        }
    };

    const handleRemoveItem = (slotIdx: number, e: React.MouseEvent) => {
        e.stopPropagation();
        onItemChange(slotIdx, '');
    };

    return (
        <div className="relative">
            <span className="text-xs font-semibold text-slate-400 block mb-2 font-mono">
                Items (6 slots)
            </span>

            {/* Grid dos 6 Slots de Itens estilo LoL HUD */}
            <div className="grid grid-cols-6 gap-2">
                {items.map((item, idx) => (
                    <div
                        key={idx}
                        onClick={() => setActiveSlot(idx)}
                        className={`group relative aspect-square rounded-lg border flex items-center justify-center cursor-pointer transition-all duration-150 overflow-hidden ${
                            item
                                ? 'bg-slate-950 border-amber-500/50 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                        }`}
                        title={item ? `${item.name} (Click to replace)` : 'Empty slot (Click to choose)'}
                    >
                        {item ? (
                            <>
                                {item.iconUrl ? (
                                    <img
                                        src={item.iconUrl}
                                        alt={item.name}
                                        className="w-full h-full object-cover rounded-md"
                                    />
                                ) : (
                                    <span className="text-[10px] text-amber-300 font-bold p-1 text-center truncate">
                                        {item.name.slice(0, 3)}
                                    </span>
                                )}

                                {/* Botão rápido de remover ao passar o mouse */}
                                <button
                                    type="button"
                                    onClick={(e) => handleRemoveItem(idx, e)}
                                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                    title="Sell / Remove item"
                                >
                                    ×
                                </button>
                            </>
                        ) : (
                            <span className="text-slate-700 text-xs font-mono group-hover:text-slate-500 transition-colors">
                                +
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Pop-up / Modal Flutuante de Seleção de Itens */}
            {activeSlot !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
                    onClick={() => setActiveSlot(null)}
                >
                    <div
                        className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-sm w-full space-y-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header do Pop-up */}
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                                Choose Item (Slot {activeSlot + 1})
                            </span>
                            <button
                                type="button"
                                onClick={() => setActiveSlot(null)}
                                className="text-slate-400 hover:text-white text-base leading-none px-1"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Botão de Esvaziar Slot */}
                        <button
                            type="button"
                            onClick={() => handleSelectItem('')}
                            className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <span>🗑️</span> Empty this slot
                        </button>

                        {/* Grid dos itens disponíveis no mock */}
                        <div className="grid grid-cols-4 gap-2.5 max-h-60 overflow-y-auto pr-1">
                            {availableItems.map((availItem) => (
                                <button
                                    key={availItem.id}
                                    type="button"
                                    onClick={() => handleSelectItem(availItem.id)}
                                    className="group flex flex-col items-center gap-1 p-1.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-amber-500/80 transition-all cursor-pointer"
                                    title={`${availItem.name} (${availItem.cost} gold)`}
                                >
                                    <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-700 group-hover:border-amber-400 transition-colors bg-slate-900">
                                        {availItem.iconUrl ? (
                                            <img
                                                src={availItem.iconUrl}
                                                alt={availItem.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                                                ?
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-300 text-center truncate w-full group-hover:text-amber-300">
                                        {availItem.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}