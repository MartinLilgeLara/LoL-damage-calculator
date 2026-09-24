import type { Item } from '../types/game';

export const mockItems: Item[] = [
    // --- MAGOS & PODER DE HABILIDADE (AP) ---
    {
        id: 'liandry',
        name: "Liandry's Torment",
        cost: 3000,
        stats: { ap: 70, hp: 300 },
        passives: [
            {
                id: 'torment',
                name: 'Torment',
                category: 'dot_burn',
                duration: 3,
                tickRate: 1,
                scalingsPerSecond: [{ attribute: 'targetMaxHp', ratio: [0.02] }],
                damageType: 'magic',
                unique: true,
            },
        ],
    },
    {
        id: 'rabadon',
        name: "Rabadon's Deathcap",
        cost: 3600,
        stats: { ap: 140 },
        passives: [
            {
                id: 'magical_opus',
                name: 'Magical Opus',
                category: 'stat_multiplier',
                stat: 'ap',
                percent: 0.35,
                unique: true,
            },
        ],
    },
    {
        id: 'luden',
        name: "Luden's Companion",
        cost: 3000,
        stats: { ap: 90, haste: 20, flatMagicPen: 10 },
        passives: [
            {
                id: 'fire',
                name: 'Fire',
                category: 'proc_damage',
                trigger: 'on_ability_hit',
                baseDamage: 45,
                scalings: [{ attribute: 'ap', ratio: [0.12] }],
                damageType: 'magic',
                unique: true,
            },
        ],
    },
    {
        id: 'lich_bane',
        name: 'Lich Bane',
        cost: 3200,
        stats: { ap: 100, haste: 15, bonusAtkSpeedPercent: 8 },
        passives: [
            {
                id: 'spellblade_lich',
                name: 'Spellblade',
                category: 'proc_damage',
                trigger: 'spellblade',
                scalings: [
                    { attribute: 'baseAd', ratio: [0.75] },
                    { attribute: 'ap', ratio: [0.4] },
                ],
                damageType: 'magic',
                cooldown: 1.5,
                unique: true,
            },
        ],
    },
    {
        id: 'void_staff',
        name: 'Void Staff',
        cost: 3000,
        stats: { ap: 80, percentMagicPen: 40 },
    },
    {
        id: 'sorcerer_shoes',
        name: "Sorcerer's Shoes",
        cost: 1100,
        stats: { flatMagicPen: 18 },
    },

    // --- LUTADORES & AD BRUTO ---
    {
        id: 'sheen',
        name: 'Sheen',
        cost: 900,
        stats: { haste: 10 },
        passives: [
            {
                id: 'spellblade_sheen',
                name: 'Spellblade',
                category: 'proc_damage',
                trigger: 'spellblade',
                scalings: [{ attribute: 'baseAd', ratio: [1.0] }],
                damageType: 'physical',
                cooldown: 1.5,
                unique: true,
            },
        ],
    },

    // --- ATIRADORES & CRÍTICO ---
    {
        id: 'infinity_edge',
        name: 'Infinity Edge',
        cost: 3400,
        stats: {
            ad: 80,
            critChance: 25,
            critDamage: 40, // +40% de multiplicador de crítico (175% -> 215%)
        },
    },
    {
        id: 'lord_dominik',
        name: "Lord Dominik's Regards",
        cost: 3000,
        stats: {
            ad: 45,
            critChance: 25,
            percentArmorPen: 40,
        },
    },

    // --- TANQUES & RESISTÊNCIAS ---
    {
        id: 'sunfire_aegis',
        name: 'Sunfire Aegis',
        cost: 2700,
        stats: { hp: 500, armor: 50 },
        passives: [
            {
                id: 'immolate',
                name: 'Immolate',
                category: 'dot_burn',
                duration: 3,
                tickRate: 1,
                baseDamagePerSecond: 15,
                scalingsPerSecond: [{ attribute: 'bonusHp', ratio: [0.0175] }],
                damageType: 'magic',
                unique: true,
            },
        ],
    },
    {
        id: 'heartsteel',
        name: 'Heartsteel',
        cost: 3000,
        stats: { hp: 900 },
        passives: [
            {
                id: 'colossal_consumption',
                name: 'Colossal Consumption',
                category: 'proc_damage',
                trigger: 'on_hit',
                baseDamage: 80,
                scalings: [{ attribute: 'bonusHp', ratio: [0.12] }],
                damageType: 'physical',
                cooldown: 30,
                unique: true,
            },
        ],
    },
    {
        id: 'thornmail',
        name: 'Thornmail',
        cost: 2700,
        stats: { hp: 350, armor: 70 },
        passives: [
            {
                id: 'thorns',
                name: 'Thorns',
                category: 'proc_damage',
                trigger: 'on_hit',
                baseDamage: 10,
                scalings: [{ attribute: 'bonusArmor', ratio: [0.25] }],
                damageType: 'magic',
                unique: true,
            },
        ],
    },
    {
        id: 'spirit_visage',
        name: 'Spirit Visage',
        cost: 2900,
        stats: { hp: 450, mr: 60, haste: 10 },
    },
];