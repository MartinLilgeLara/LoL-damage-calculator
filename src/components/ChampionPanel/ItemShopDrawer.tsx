import { useState, useMemo } from 'react';
import type { Item, ItemCategory } from '../../types/game';

interface ItemShopDrawerProps {
    side: 'left' | 'right';
    activeSlot: number | null;
    availableItems: Item[];
    onSelectItem: (itemId: string) => void;
    onClose: () => void;
}

export function ItemShopDrawer({
                                   side,
                                   activeSlot,
                                   availableItems,
                                   onSelectItem,
                                   onClose,
                               }: ItemShopDrawerProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Extrai dinamicamente todas as categorias únicas existentes nos itens disponíveis
    const availableCategories = useMemo(() => {
        const categoriesSet = new Set<string>();
        for (const item of availableItems) {
            if (item.categories) {
                for (const cat of item.categories) {
                    categoriesSet.add(cat);
                }
            }
        }
        return ['All', ...Array.from(categoriesSet).sort()];
    }, [availableItems]);

    if (activeSlot === null) return null;

    // Filtra os itens respeitando a categoria dinâmica e a busca
    const filteredItems = availableItems.filter((item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (selectedCategory === 'All') return true;

        return item.categories?.includes(selectedCategory as ItemCategory) ?? false;
    });

    const isLeft = side === 'left';

    return (
        <div
            className={`fixed inset-y-0 z-50 flex items-center justify-center p-3 pointer-events-none ${
                isLeft ? 'left-3 sm:left-6' : 'right-3 sm:right-6'
            }`}
        >
            <div className="w-80 max-h-[85vh] bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 pointer-events-auto backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 text-left font-mono">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                            Item Shop
                        </span>
                        <span className="text-[10px] text-slate-500">Equipping Slot {activeSlot + 1}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded leading-none text-base cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                {/* Busca */}
                <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                {/* Abas Geradas Dinamicamente */}
                <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] uppercase font-bold scrollbar-thin scrollbar-thumb-slate-800">
                    {availableCategories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2 py-1 rounded-md transition-all whitespace-nowrap cursor-pointer ${
                                selectedCategory === cat
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Esvaziar Slot */}
                <button
                    type="button"
                    onClick={() => {
                        onSelectItem('');
                        onClose();
                    }}
                    className="w-full py-1 px-2 rounded-lg text-xs font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                    <span>🗑️</span> Empty this slot
                </button>

                {/* Grid de Itens */}
                <div className="grid grid-cols-4 gap-2 overflow-y-auto max-h-72 pr-1">
                    {filteredItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                onSelectItem(item.id);
                                onClose();
                            }}
                            className="group flex flex-col items-center gap-1 p-1 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800 hover:border-amber-500/80 transition-all cursor-pointer"
                            title={`${item.name} (${item.cost}g)`}
                        >
                            <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-700 group-hover:border-amber-400 transition-colors bg-slate-900 shrink-0">
                                {item.iconUrl ? (
                                    <img
                                        src={item.iconUrl}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                                        ?
                                    </div>
                                )}
                            </div>
                            <span className="text-[9px] text-slate-400 truncate w-full text-center group-hover:text-amber-300">
                                {item.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}