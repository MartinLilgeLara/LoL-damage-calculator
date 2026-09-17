import type { ComputedUnitStats, DamageType } from '../types/game';

export interface MitigationResult {
    rawDamage: number;
    effectiveDamage: number;
    damageType: DamageType;
}

export function calculateEffectiveArmor(
    attacker: ComputedUnitStats,
    target: ComputedUnitStats
): number {
    const baseArmor = target.armor;

    if (baseArmor <= 0) return baseArmor;

    let armor = baseArmor * (1 - attacker.percentArmorPen / 100);

    const flatPenetration = attacker.lethality * (0.6 + (0.4 * attacker.level) / 18);
    armor = Math.max(0, armor - flatPenetration);

    return armor;
}


export function calculateEffectiveMr(
    attacker: ComputedUnitStats,
    target: ComputedUnitStats
): number {
    const baseMr = target.magicResistance;

    if (baseMr <= 0) return baseMr;

    let mr = baseMr * (1 - attacker.percentMagicPen / 100);
    mr = Math.max(0, mr - attacker.flatMagicPen);

    return mr;
}


export function mitigateDamage(
    rawDamage: number,
    damageType: DamageType,
    attacker: ComputedUnitStats,
    target: ComputedUnitStats
): MitigationResult {
    if (rawDamage <= 0) {
        return { rawDamage: 0, effectiveDamage: 0, damageType };
    }

    if (damageType === 'true') {
        return {
            rawDamage: Math.round(rawDamage),
            effectiveDamage: Math.round(rawDamage),
            damageType,
        };
    }

    let effectiveDamage = rawDamage;

    if (damageType === 'physical') {
        const effectiveArmor = calculateEffectiveArmor(attacker, target);
        if (effectiveArmor >= 0) {
            effectiveDamage = rawDamage * (100 / (100 + effectiveArmor));
        } else {
            effectiveDamage = rawDamage * (2 - 100 / (100 - effectiveArmor));
        }
    } else if (damageType === 'magic') {
        const effectiveMr = calculateEffectiveMr(attacker, target);
        if (effectiveMr >= 0) {
            effectiveDamage = rawDamage * (100 / (100 + effectiveMr));
        } else {
            effectiveDamage = rawDamage * (2 - 100 / (100 - effectiveMr));
        }
    }

    return {
        rawDamage: Math.round(rawDamage),
        effectiveDamage: Math.round(effectiveDamage),
        damageType,
    };
}