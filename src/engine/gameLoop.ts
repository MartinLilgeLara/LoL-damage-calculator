import type { ComputedUnitStats, RecastStates } from '../types/game';
export interface CombatCooldowns {
    [skillKey: string]: number;
}

export function updateRecastWindows(
    recastStates: RecastStates,
    deltaSeconds: number
): { nextStates: RecastStates; expiredSkills: string[] } {
    const nextStates: RecastStates = {};
    const expiredSkills: string[] = [];

    for (const [key, state] of Object.entries(recastStates)) {
        const nextTime = state.windowRemaining - deltaSeconds;
        if (nextTime <= 0) {
            expiredSkills.push(key);
        } else {
            nextStates[key] = {
                ...state,
                windowRemaining: nextTime,
            };
        }
    }

    return { nextStates, expiredSkills };
}

export function calculateHpRegen (
    currentHp:number,
    stats: ComputedUnitStats,
    deltaSeconds:number
): number {
    if(currentHp <=0 || currentHp >= stats.totalHp) return currentHp;
    const regenPerSec = stats.hpRegen / 5;
    return Math.min(stats.totalHp, currentHp + regenPerSec * deltaSeconds)
}

export function calculateResourceTick(
    currentResource:number,
    stats: ComputedUnitStats,
    deltaSeconds:number,
    outOfCombatTimer:number
): number {
    if(stats.resourceType === 'none') return 0;
    if (stats.resourceType === 'mana') {
        if (currentResource >= stats.maxResource) return stats.maxResource;
        const regenPerSec = stats.resourceRegen / 5;
        return Math.min(stats.maxResource, currentResource + regenPerSec * deltaSeconds);
    }
    if (stats.resourceType === 'fury') {
        if (outOfCombatTimer >= 5.0 && currentResource > 0) {
            const decayPerSec = 4.0;
            return Math.max(0, currentResource - decayPerSec * deltaSeconds);
        }
        return currentResource;
    }

    return currentResource;
}

export function updateCooldowns(
    cooldowns: CombatCooldowns,
    deltaSeconds: number,
): CombatCooldowns{
    const updated: CombatCooldowns = {};
    for (const [key,remaining] of Object.entries(cooldowns)) {
        updated[key] = Math.max(0, remaining - deltaSeconds)
    }
    return updated;
}


export function calculateActualCooldown(baseCooldown:number, abilityHaste:number):number{
    const hasteMultiplier = 100/(100+Math.max(0,abilityHaste));
    return Number((baseCooldown * hasteMultiplier).toFixed(2));
}