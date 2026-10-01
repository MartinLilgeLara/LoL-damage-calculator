import { useState } from 'react';
import type { Item } from '../../types/game';
import { ItemShopDrawer } from './ItemShopDrawer';

interface ItemSlotsProps {
    side?: 'left' | 'right';
    items: (Item | null)[];
    availableItems: Item[];
    onItemChange: (slotIndex: number, itemId: string) => void;
}

export function ItemSlots({ side = 'left', items, availableItems, onItemChange }: ItemSlotsProps) {
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

            {/* Loja Lateral Retrátil Espelhada */}
            <ItemShopDrawer
                side={side}
                activeSlot={activeSlot}
                availableItems={availableItems}
                onSelectItem={handleSelectItem}
                onClose={() => setActiveSlot(null)}
            />
        </div>
    );
}