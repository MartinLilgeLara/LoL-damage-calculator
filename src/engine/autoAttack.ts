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
    spellbladeDamageApplied?: {
        raw: number;
        effective: number;
        type: DamageType;
        itemName: string;
    };
}

export interface AttackTiming {
    cycleTime: number;   // Tempo total entre ataques (1 / atkSpeed)
    windupTime: number;  // Tempo até o golpe conectar
}

/**
 * Calcula os tempos de windup e recuperação baseado no Attack Speed do campeão.
 * windupPercent padrão: ~0.20 (20% da animação para corpo a corpo).
 */
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
/**
 * Calcula o dano de um ataque básico, processando crítico e mitigação de armadura.
 * forceCrit pode ser usado para testes determinísticos caso necessário.
 */
export function calculateAutoAttackDamage(
    attacker: ComputedUnitStats,
    target: ComputedUnitStats,
    spellbladeActiveBuff?: SpellbladeBuff | null,
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

    // Se houver Spellblade ativo, calcula e mitiga o dano adicional
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

    return {
        rawDamage: Math.round(rawDamage),
        effectiveDamage: totalEffectiveDamage,
        isCritical,
        mitigation: physicalMitigation,
        spellbladeDamageApplied: spellbladeData,
    };
}
