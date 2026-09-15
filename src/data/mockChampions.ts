import type {Champion, Item} from '../types/game';

export const mockChampions: Champion[] = [
    {
        id: 'ahri',
        name: 'Ahri',
        baseStats: {
            hp: 590,
            hpPerLevel: 104,
            armor: 21,
            armorPerLevel: 4.7,
            magicResistance: 30,
            mrPerLevel: 1.3,
            baseAd: 53,
            adPerLevel: 3.0,
            atkSpeed: 0.668,
            asPerLevel: 2.2,
        },
        skills: [
            {
                key: 'Q',
                name: 'Orbe da Ilusão',
                maxRank: 5,
                stages: [
                    {
                        id: 'ahri-q1',
                        name: 'Ida',
                        damageType: 'magic',
                        baseDamage: [40, 65, 90, 115, 140],
                        scalings: [{ attribute: 'ap', ratio: [0.5, 0.5, 0.5, 0.5, 0.5] }],
                    },
                    {
                        id: 'ahri-q2',
                        name: 'Volta',
                        damageType: 'true',
                        baseDamage: [40, 65, 90, 115, 140],
                        scalings: [{ attribute: 'ap', ratio: [0.5, 0.5, 0.5, 0.5, 0.5] }],
                    },
                ],
            },
        ],
    },
    {
        id: 'garen',
        name: 'Garen',
        baseStats: {
            hp: 690,
            hpPerLevel: 98,
            armor: 38,
            armorPerLevel: 4.2,
            magicResistance: 32,
            mrPerLevel: 1.55,
            baseAd: 69,
            adPerLevel: 4.5,
            atkSpeed: 0.625,
            asPerLevel: 3.65,
        },
        skills: [
            {
                key: 'Q',
                name: 'Acerto Decisivo',
                maxRank: 5,
                stages: [
                    {
                        id: 'garen-q',
                        name: 'Pancada',
                        damageType: 'physical',
                        baseDamage: [30, 60, 90, 120, 150],
                        scalings: [{ attribute: 'totalAd', ratio: [0.5, 0.5, 0.5, 0.5, 0.5] }],
                    },
                ],
            },
        ],
    },
];

export const mockItems: Item[] = [
    { id: 'ludens', name: 'Companheiro de Luaden', cost: 2900, stats: { ap: 90, flatMagicPen: 10 } },
    { id: 'rabadon', name: 'Capuz da Morte de Rabadon', cost: 3600, stats: { ap: 140 } },
    { id: 'spirit_visage', name: 'Semblante Espiritual', cost: 2700, stats: { hp: 400, mr: 50 } },
    { id: 'thornmail', name: 'Armadura de Espinhos', cost: 2700, stats: { hp: 350, armor: 70 } },
];