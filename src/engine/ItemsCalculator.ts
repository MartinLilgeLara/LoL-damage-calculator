import type { ItemPassive, ComputedUnitStats, DamageType, SkillStage } from '../types/game';
import {calculateEffectiveDamage, } from './calculator.ts';
export interface CalculatedPassiveDamage {
    passiveId: string;
    passiveName: string;
    itemName: string;
    category: 'proc_damage' | 'dot_burn';
    damageType: DamageType;
    rawDamage: number;
    effectiveDamage: number;
    description: string;
}

export function calculateItemPassiveDamage(
    passive: ItemPassive,
    itemName: string,
    attacker: ComputedUnitStats,
    target: ComputedUnitStats
): CalculatedPassiveDamage | null {
    if (passive.category === 'stat_multiplier') return null;

    if (passive.category === 'proc_damage') {
        const dummyStage: SkillStage = {
            id: passive.id,
            name: passive.name,
            damageType: passive.damageType,
            baseDamage: [passive.baseDamage ?? 0],
            scalings: passive.scalings,
        };

        const damage = calculateEffectiveDamage(dummyStage, 1, attacker, target);

        return {
            passiveId: passive.id,
            passiveName: passive.name,
            itemName,
            category: 'proc_damage',
            damageType: passive.damageType,
            rawDamage: damage.rawDamage,
            effectiveDamage: damage.effectiveDamage,
            description: passive.trigger === 'spellblade' ? 'On spell cast (Spellblade)' : 'On-hit',
        };
    }

    if (passive.category === 'dot_burn') {
        const dummyStage: SkillStage = {
            id: passive.id,
            name: passive.name,
            damageType: passive.damageType,
            baseDamage: [(passive.baseDamagePerSecond ?? 0) * passive.duration],

            scalings: passive.scalingsPerSecond.map((s) => ({
                attribute: s.attribute,
                ratio: s.ratio.map((r) => r * passive.duration),
            })),
        };

        const damage = calculateEffectiveDamage(dummyStage, 1, attacker, target);

        return {
            passiveId: passive.id,
            passiveName: passive.name,
            itemName,
            category: 'dot_burn',
            damageType: passive.damageType,
            rawDamage: damage.rawDamage,
            effectiveDamage: damage.effectiveDamage,
            description: `Damage over ${passive.duration}s`,
        };
    }

    return null;
}