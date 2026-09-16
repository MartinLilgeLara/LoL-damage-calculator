import type { Item } from '../../types/game';

interface ItemSlotsProps {
    items: (Item | null)[];
    availableItems: Item[];
    onItemChange: (slotIndex: number, itemId: string) => void;
}

export function ItemSlots({ items, availableItems, onItemChange }: ItemSlotsProps) {
    return (
        <div>
            <span className="text-xs font-semibold text-slate-400 block mb-2">Itens (6 slots)</span>
            <div className="grid grid-cols-3 gap-2">
                {items.map((item, idx) => (
                    <select
                        key={idx}
                        value={item?.id || ''}
                        onChange={(e) => onItemChange(idx, e.target.value)}
                        className="bg-slate-800 border border-slate-700 text-[11px] rounded p-1.5 truncate focus:outline-none"
                    >
                        <option value="">(Empty)</option>
                        {availableItems.map((i) => (
                            <option key={i.id} value={i.id}>
                                {i.name}
                            </option>
                        ))}
                    </select>
                ))}
            </div>
        </div>
    );
}