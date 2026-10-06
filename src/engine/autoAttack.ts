import type { ComputedUnitStats, DamageType, Item } from '../types/game';
import { mitigateDamage, type MitigationResult } from './mitigation';

export interface SpellbladeBuff {
    active: boolean;
    durationRemaining: number;
    cooldownRemaining: number;
    sourceItemName: string;
    damageType: DamageType;
    extraDamage: number;
}

export interface AutoAttackResult {
    rawDamage: number;
    effectiveDamage: number;
    isCritical: boolean;
    mitigation: MitigationResult;
    // >>> [HIGHLIGHT: CURA DE LIFESTEAL COMPUTADA NO GOLPE] <<<
    healedAmount: number;
    spellbladeDamageApplied?: {
        raw: number;
        effective: number;
        type: DamageType;
        itemName: string;
    };
    // >>> [HIGHLIGHT: REGISTRO DE ON-HIT PROCESSADO (EX: HEARTSTEEL)] <<<
    onHitDamageApplied?: {
        raw: number;
        effective: number;
        type: DamageType;
        itemName: string;
    };
}

export interface AttackTiming {
    cycleTime: number;
    windupTime: number;
}

export function calculateAttackTiming(
    atkSpeed: number,
    windupPercent: number = 0.20
): AttackTiming {
    const safeAtkSpeed = Math.max(0.2, atkSpeed);
    const cycleTime = 1 / safeAtkSpeed;
    const windupTime = cycleTime * windupPercent;

    return {
        cycleTime: Number(cycleTime.toFixed(3)),
        windupTime: Number(windupTime.toFixed(3)),
    };
}

export function getSpellbladePassive(items: (Item | null)[], attacker: ComputedUnitStats) {
    for (const item of items) {
        if (!item?.passives) continue;
        const passive = item.passives.find((p) => p.category === 'proc_damage' && p.trigger === 'spellblade');
        if (passive && passive.category === 'proc_damage') {
            let rawExtra = 0;
            for (const scaling of passive.scalings) {
                const ratio = scaling.ratio[0] ?? 0;
                if (scaling.attribute === 'baseAd') rawExtra += attacker.baseAd * ratio;
                if (scaling.attribute === 'ap') rawExtra += attacker.ap * ratio;
            }
            return {
                itemName: item.name,
                damageType: passive.damageType,
                rawExtra: Math.round(rawExtra),
                cooldown: passive.cooldown ?? 1.5,
            };
        }
    }
    return null;
}

// >>> [HIGHLIGHT: NOVA FUNÇÃO DE RESOLUÇÃO ON-HIT (HEARTSTEEL, ETC)] <<<
export function calculateItemOnHitDamage(items: (Item | null)[] = [], attacker: ComputedUnitStats) {
    if (!Array.isArray(items)) return null; // <- Evita crash caso não seja passado um array

    for (const item of items) {
        if (!item?.passives) continue;
        const onHitPassive = item.passives.find((p) => p.category === 'proc_damage' && p.trigger === 'on_hit');
        if (onHitPassive && onHitPassive.category === 'proc_damage') {
            let rawExtra = onHitPassive.baseDamage ?? 0;
            for (const scaling of onHitPassive.scalings) {
                const ratio = scaling.ratio[0] ?? 0;
                if (scaling.attribute === 'bonusHp') rawExtra += attacker.bonusHp * ratio;
                if (scaling.attribute === 'totalHp') rawExtra += attacker.totalHp * ratio;
                if (scaling.attribute === 'bonusArmor') rawExtra += (attacker.armor - attacker.baseAd) * ratio;
            }
            return {
                itemName: item.name,
                damageType: onHitPassive.damageType,
                rawExtra: Math.round(rawExtra),
            };
        }
    }
    return null;
}

export function calculateAutoAttackDamage(
    attacker: ComputedUnitStats,
    target: ComputedUnitStats,
    items: (Item | null)[] = [],              // <-- 3º parâmetro agora é items!
    spellbladeActiveBuff?: SpellbladeBuff | null, // <-- 4º parâmetro virou o spellblade!
    forceCrit?: boolean
): AutoAttackResult {
    const roll = Math.random() * 100;
    const isCritical = forceCrit !== undefined ? forceCrit : roll < attacker.critChance;

    let rawDamage = attacker.totalAd;
    if (isCritical) {
        rawDamage = rawDamage * (attacker.critDamage / 100);
    }

    const physicalMitigation = mitigateDamage(rawDamage, 'physical', attacker, target);
    let totalEffectiveDamage = physicalMitigation.effectiveDamage;

    let spellbladeData: AutoAttackResult['spellbladeDamageApplied'] = undefined;
    if (spellbladeActiveBuff?.active && spellbladeActiveBuff.extraDamage > 0) {
        const extraMit = mitigateDamage(
            spellbladeActiveBuff.extraDamage,
            spellbladeActiveBuff.damageType,
            attacker,
            target
        );
        totalEffectiveDamage += extraMit.effectiveDamage;
        spellbladeData = {
            raw: spellbladeActiveBuff.extraDamage,
            effective: extraMit.effectiveDamage,
            type: spellbladeActiveBuff.damageType,
            itemName: spellbladeActiveBuff.sourceItemName,
        };
    }

    // >>> [HIGHLIGHT: PROCESSA ON-HIT SE EXISTIR (EX: HEARTSTEEL)] <<<
    let onHitData: AutoAttackResult['onHitDamageApplied'] = undefined;
    const onHitEffect = calculateItemOnHitDamage(items, attacker);
    if (onHitEffect && onHitEffect.rawExtra > 0) {
        const onHitMit = mitigateDamage(onHitEffect.rawExtra, onHitEffect.damageType, attacker, target);
        totalEffectiveDamage += onHitMit.effectiveDamage;
        onHitData = {
            raw: onHitEffect.rawExtra,
            effective: onHitMit.effectiveDamage,
            type: onHitEffect.damageType,
            itemName: onHitEffect.itemName,
        };
    }

    // >>> [HIGHLIGHT: LIFESTEAL CURA SOBRE O DANO FÍSICO DO ATAQUE BÁSICO] <<<
    const healedAmount = attacker.lifesteal > 0
        ? Math.round(physicalMitigation.effectiveDamage * (attacker.lifesteal / 100))
        : 0;

    return {
        rawDamage: Math.round(rawDamage),
        effectiveDamage: totalEffectiveDamage,
        isCritical,
        mitigation: physicalMitigation,
        healedAmount,
        spellbladeDamageApplied: spellbladeData,
        onHitDamageApplied: onHitData,
    };
}