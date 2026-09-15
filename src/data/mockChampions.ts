import type { Champion } from '../types/game';

export const mockAhri: Champion = {
    id: 'ahri',
    name: 'Ahri',
    baseStats: {
        hp: 590,
        hpPerLevel: 104,
        armor: 21,
        magicResistance: 30,
        mrPerLevel: 1.3,
        baseAd: 53,
        adPerLevel: 3,
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
                    name: 'Ida (Mágico)',
                    damageType: 'magic',
                    baseDamage: [40, 65, 90, 115, 140],
                    scalings: [{ attribute: 'ap', ratio: [0.5, 0.5, 0.5, 0.5, 0.5] }]
                },
                {
                    id: 'ahri-q2',
                    name: 'Volta (Verdadeiro)',
                    damageType: 'true',
                    baseDamage: [40, 65, 90, 115, 140],
                    scalings: [{ attribute: 'ap', ratio: [0.5, 0.5, 0.5, 0.5, 0.5] }]
                }
            ]
        }
    ]
};