import type { ComputedUnitStats } from '../types/game';
import { mitigateDamage, type MitigationResult } from './mitigation';

export interface AutoAttackResult {
    rawDamage: number;
    effectiveDamage: number;
    isCritical: boolean;
    mitigation: MitigationResult;
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

/**
 * Calcula o dano de um ataque básico, processando crítico e mitigação de armadura.
 * forceCrit pode ser usado para testes determinísticos caso necessário.
 */
export function calculateAutoAttackDamage(
    attacker: ComputedUnitStats,
    target: ComputedUnitStats,
    forceCrit?: boolean
): AutoAttackResult {
    const roll = Math.random() * 100;
    const isCritical = forceCrit !== undefined ? forceCrit : roll < attacker.critChance;

    // Dano base do ataque básico = 100% totalAd
    let rawDamage = attacker.totalAd;

    if (isCritical) {
        rawDamage = rawDamage * (attacker.critDamage / 100);
    }

    // Ataques básicos causam dano físico e passam pela armadura do alvo
    const mitigation = mitigateDamage(rawDamage, 'physical', attacker, target);

    return {
        rawDamage: Math.round(rawDamage),
        effectiveDamage: mitigation.effectiveDamage,
        isCritical,
        mitigation,
    };
}