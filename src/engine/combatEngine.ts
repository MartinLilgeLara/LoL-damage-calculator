import type {
    Champion,
    Item,
    ComputedUnitStats,
    ActiveAttackEmpower,
    RecastStates,
} from '../types/game';
import { calculateActualCooldown, type ActiveDotInstance } from './gameLoop';
import { getSpellbladePassive, type SpellbladeBuff } from './autoAttack';
import { triggerAbilityHitItemDots } from './ItemsCalculator';
import { mitigateDamage } from './mitigation';
import type { RawLogPayload } from '../hooks/useCombatLog';

export interface AbilityCastResult {
    nextHp: number;
    nextResource: number;
    nextCooldowns: Record<string, number>;
    nextRecasts: RecastStates;
    nextSpellblade: SpellbladeBuff;
    newActiveEmpower: ActiveAttackEmpower | null;
    dotsToPush: ActiveDotInstance[];
    logsToPush: RawLogPayload[];
    shouldResetAttackTimer: boolean;
}

export function executeAbilityCast(params: {
    skillKey: string;
    damageAmount: number;
    furyCost: number;
    attackerChamp: Champion;
    attackerStats: ComputedUnitStats;
    targetStats: ComputedUnitStats;
    attackerItems: (Item | null)[];
    skillRanks: Record<string, number>;
    currentCooldowns: Record<string, number>;
    currentRecasts: RecastStates;
    currentHp: number;
    currentResource: number;
    spellbladeState: SpellbladeBuff;
}): AbilityCastResult {
    const {
        skillKey,
        damageAmount,
        furyCost,
        attackerChamp,
        attackerStats,
        targetStats,
        attackerItems,
        skillRanks,
        currentCooldowns,
        currentRecasts,
        currentHp,
        currentResource,
        spellbladeState,
    } = params;

    const skill = attackerChamp.skills.find((s) => s.key === skillKey);
    const rank = skillRanks[skillKey] || 1;

    let totalDamage = damageAmount;
    let spellbladeConsumed = false;
    let nextSpellblade = { ...spellbladeState };
    const logsToPush: RawLogPayload[] = [];
    const dotsToPush: ActiveDotInstance[] = [];
    let newActiveEmpower: ActiveAttackEmpower | null = null;
    let nextCooldowns = { ...currentCooldowns };
    let nextRecasts = { ...currentRecasts };

    if (!skill) {
        return {
            nextHp: Math.max(0, currentHp - totalDamage),
            nextResource: Math.max(0, currentResource - furyCost),
            nextCooldowns,
            nextRecasts,
            nextSpellblade,
            newActiveEmpower,
            dotsToPush,
            logsToPush,
            shouldResetAttackTimer: false,
        };
    }

    // 1. On-Hit / Spellblade na habilidade
    if (skill.appliesOnHit && spellbladeState.active && spellbladeState.extraDamage > 0) {
        const extraMit = mitigateDamage(
            spellbladeState.extraDamage,
            spellbladeState.damageType,
            attackerStats,
            targetStats
        );
        totalDamage += extraMit.effectiveDamage;
        spellbladeConsumed = true;
        nextSpellblade = { ...nextSpellblade, active: false, durationRemaining: 0 };
    }

    // 2. Disparo de novo Sheen / Lich Bane
    const spellbladeInfo = getSpellbladePassive(attackerItems, attackerStats);
    if (spellbladeInfo && nextSpellblade.cooldownRemaining <= 0 && !spellbladeConsumed) {
        nextSpellblade = {
            active: true,
            durationRemaining: 10.0,
            cooldownRemaining: spellbladeInfo.cooldown,
            sourceItemName: spellbladeInfo.itemName,
            damageType: spellbladeInfo.damageType,
            extraDamage: spellbladeInfo.rawExtra,
        };
    }

    // 3. Modificador de Ataque (W do Renekton, Q do Garen)
    if (skill.empowersNextAttack) {
        newActiveEmpower = {
            skillKey: skill.key as 'Q' | 'W' | 'E' | 'R',
            skillName: skill.name,
            rank,
            furyCost,
            durationRemaining: 6.0,
        };

        if (skill.cooldown) {
            const baseCd = skill.cooldown[rank - 1] ?? skill.cooldown[0];
            nextCooldowns[skillKey] = calculateActualCooldown(baseCd, attackerStats.haste);
        }

        logsToPush.push({
            source: `${attackerChamp.name} (${skillKey}) - Buff Ready`,
            rawDamage: 0,
            effectiveDamage: 0,
            damageType: 'physical',
        });

        return {
            nextHp: currentHp,
            nextResource: currentResource,
            nextCooldowns,
            nextRecasts,
            nextSpellblade,
            newActiveEmpower,
            dotsToPush,
            logsToPush,
            shouldResetAttackTimer: Boolean(skill.resetsAttackTimer),
        };
    }

    // 4. Logs de dano direto
    if (totalDamage > 0 || spellbladeConsumed) {
        const logLabel = spellbladeConsumed
            ? `${attackerChamp.name} (${skillKey}) + ${spellbladeState.sourceItemName}`
            : `${attackerChamp.name} (${skillKey}) - ${skill.name}`;

        logsToPush.push({
            source: logLabel,
            rawDamage: damageAmount + (spellbladeConsumed ? spellbladeState.extraDamage : 0),
            effectiveDamage: totalDamage,
            damageType: skill.stages[0]?.damageType ?? 'physical',
        });
    }

    // 5. Início de DoTs Nativos
    const dotStages = skill.stages.filter((s) => s.isOverTime === true);
    for (const stage of dotStages) {
        dotsToPush.push({
            id: `${skill.key}_${stage.id}`,
            sourceName: `${attackerChamp.name} (${skill.key}) - ${stage.name}`,
            stage,
            rank,
            durationRemaining: stage.durationSeconds ?? 3.0,
            tickInterval: stage.tickInterval ?? 0.5,
            timeUntilNextTick: stage.tickInterval ?? 0.5,
        });
    }

    // 6. Disparo Imediato de DoTs de Itens (ex: Liandry)
    // Dispara no instante do cast se houver dano direto OU se a habilidade inicia um DoT contínuo
    const hasInitialDamage = totalDamage > 0;
    const hasNativeDoT = dotStages.length > 0;

    if ((hasInitialDamage || hasNativeDoT) && !skill.empowersNextAttack) {
        const itemDots = triggerAbilityHitItemDots(attackerItems);
        dotsToPush.push(...itemDots);
    }

    // 7. Recasts e Cooldowns
    const maxCasts = skill.maxCasts ?? 1;
    const activeRecast = currentRecasts[skillKey];
    const currentCast = activeRecast ? activeRecast.currentCast : 1;

    if (currentCast < maxCasts && skill.recastWindow) {
        nextRecasts[skillKey] = {
            currentCast: currentCast + 1,
            windowRemaining: skill.recastWindow,
        };
    } else {
        delete nextRecasts[skillKey];
        if (skill.cooldown) {
            const baseCd = skill.cooldown[rank - 1] ?? skill.cooldown[0];
            nextCooldowns[skillKey] = calculateActualCooldown(baseCd, attackerStats.haste);
        }
    }

    return {
        nextHp: Math.max(0, Number((currentHp - totalDamage).toFixed(1))),
        nextResource: Math.max(0, currentResource - furyCost),
        nextCooldowns,
        nextRecasts,
        nextSpellblade,
        newActiveEmpower,
        dotsToPush,
        logsToPush,
        shouldResetAttackTimer: Boolean(skill.resetsAttackTimer),
    };
}