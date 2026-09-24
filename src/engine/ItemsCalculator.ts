import type { Item, ItemPassive, ComputedUnitStats, DamageType, SkillStage } from '../types/game';
import type { ActiveDotInstance } from './gameLoop';
import { calculateEffectiveDamage } from './calculator';

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

export function triggerAbilityHitItemDots(
    items: (Item | null)[]
): ActiveDotInstance[] {
    const dots: ActiveDotInstance[] = [];
    const seenUnique = new Set<string>();

    for (const item of items) {
        if (!item?.passives) continue;

        for (const passive of item.passives) {
            // Identifica itens com queimação contínua (ex: Liandry)
            if (passive.category === 'dot_burn') {
                if (passive.unique && seenUnique.has(passive.id)) continue;
                if (passive.unique) seenUnique.add(passive.id);

                dots.push({
                    id: `item_${item.id}_${passive.id}`,
                    sourceName: `${item.name} (${passive.name})`,
                    stage: {
                        id: `item_stage_${passive.id}`,
                        name: passive.name,
                        damageType: passive.damageType,
                        baseDamage: [passive.baseDamagePerSecond ?? 0],
                        scalings: passive.scalingsPerSecond,
                        isOverTime: true,
                        durationSeconds: passive.duration,
                        tickInterval: passive.tickRate,
                    },
                    rank: 1,
                    durationRemaining: passive.duration,
                    tickInterval: passive.tickRate,
                    timeUntilNextTick: passive.tickRate,
                });
            }
        }
    }

    return dots;
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