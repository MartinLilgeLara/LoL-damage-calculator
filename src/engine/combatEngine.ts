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
    attackerHealedAmount: number;
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
    currentActiveEmpower?: ActiveAttackEmpower | null;
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
        currentActiveEmpower = null,
    } = params;

    const skill = attackerChamp.skills.find((s) => s.key === skillKey);
    const rank = skillRanks[skillKey] || 1;

    let totalDamage = damageAmount;
    let spellbladeConsumed = false;
    let nextSpellblade = { ...spellbladeState };
    const logsToPush: RawLogPayload[] = [];
    const dotsToPush: ActiveDotInstance[] = [];
    // PRESERVA O EMPOWER ATUAL (não zera se usar outra skill)
    let newActiveEmpower: ActiveAttackEmpower | null = currentActiveEmpower;
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
            attackerHealedAmount: 0,
        };
    }

    // 1. Gestão de Custo de Mana (Bloqueante se não tiver mana suficiente)
    let manaCostToSpend = 0;
    if (attackerStats.resourceType === 'mana') {
        const stage = skill.stages[0];
        if (stage?.manaCost && stage.manaCost.length > 0) {
            const costIdx = Math.min(rank - 1, stage.manaCost.length - 1);
            manaCostToSpend = stage.manaCost[costIdx] ?? 0;
        }

        if (currentResource < manaCostToSpend) {
            logsToPush.push({
                source: `${attackerChamp.name} (${skillKey}) - Not enough Mana (${currentResource}/${manaCostToSpend})`,
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
                dotsToPush: [],
                logsToPush,
                shouldResetAttackTimer: false,
                attackerHealedAmount: 0,
            };
        }
    }

    // Fúria consumida apenas se a habilidade for empoderada (não bloqueia a conjuração normal)
    const furyCostToSpend = attackerStats.resourceType === 'fury' ? furyCost : 0;
    const totalResourceSpent = manaCostToSpend + furyCostToSpend;

    // 2. On-Hit / Spellblade na habilidade
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

    // 3. Disparo de novo Sheen / Lich Bane
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

    // 4. Modificador de Ataque (W do Renekton, Q do Garen)
    if (skill.empowersNextAttack) {
        newActiveEmpower = {
            skillKey: skill.key as 'Q' | 'W' | 'E' | 'R',
            skillName: skill.name,
            rank,
            furyCost, // Registra se gastará 50 de fúria quando bater
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
            // >>> [CORREÇÃO: NÃO desconta fúria aqui! A fúria só é gasta quando o ataque conectar] <<<
            nextResource: attackerStats.resourceType === 'fury' ? currentResource : Math.max(0, currentResource - totalResourceSpent),
            nextCooldowns,
            nextRecasts,
            nextSpellblade,
            newActiveEmpower,
            dotsToPush,
            logsToPush,
            shouldResetAttackTimer: Boolean(skill.resetsAttackTimer),
            attackerHealedAmount: 0,
        };
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

    // 6. Logs de dano direto e disparo de passivas de impacto (Luden)
    if (totalDamage > 0 || spellbladeConsumed) {
        const { extraDamage: ludenDamage, procLogs } = triggerAbilityHitProcs(attackerItems, attackerStats, targetStats);
        totalDamage += ludenDamage;

        const logLabel = spellbladeConsumed
            ? `${attackerChamp.name} (${skillKey}) + ${spellbladeState.sourceItemName}`
            : `${attackerChamp.name} (${skillKey}) - ${skill.name}`;

        logsToPush.push({
            source: logLabel,
            rawDamage: damageAmount + (spellbladeConsumed ? spellbladeState.extraDamage : 0),
            effectiveDamage: totalDamage - ludenDamage,
            damageType: skill.stages[0]?.damageType ?? 'physical',
        });

        if (procLogs.length > 0) {
            logsToPush.push(...procLogs);
        }
    }

    // 7. Cura de Omnivamp sobre o dano da habilidade
    const attackerHealedAmount = attackerStats.omnivamp > 0
        ? Math.round(totalDamage * (attackerStats.omnivamp / 100))
        : 0;

    // 8. Disparo Imediato de DoTs de Itens (ex: Liandry)
    const hasInitialDamage = totalDamage > 0;
    const hasNativeDoT = dotStages.length > 0;
    if ((hasInitialDamage || hasNativeDoT) && !skill.empowersNextAttack) {
        const itemDots = triggerAbilityHitItemDots(attackerItems);
        dotsToPush.push(...itemDots);
    }

    // 9. Recasts e Cooldowns
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
        nextResource: Math.max(0, currentResource - totalResourceSpent),
        nextCooldowns,
        nextRecasts,
        nextSpellblade,
        newActiveEmpower, // Mantém intacto o empower do W anterior
        dotsToPush,
        logsToPush,
        shouldResetAttackTimer: Boolean(skill.resetsAttackTimer),
        attackerHealedAmount,
    };
}

function triggerAbilityHitProcs(items: (Item | null)[], attackerStats: ComputedUnitStats, targetStats: ComputedUnitStats) {
    let extraDamage = 0;
    const procLogs: RawLogPayload[] = [];

    for (const item of items) {
        if (!item?.passives) continue;
        for (const passive of item.passives) {
            if (passive.category === 'proc_damage' && passive.trigger === 'on_ability_hit') {
                let rawProc = passive.baseDamage ?? 0;
                for (const scaling of passive.scalings) {
                    const ratio = scaling.ratio[0] ?? 0;
                    if (scaling.attribute === 'ap') rawProc += attackerStats.ap * ratio;
                    if (scaling.attribute === 'totalAd') rawProc += attackerStats.totalAd * ratio;
                }

                const mit = mitigateDamage(rawProc, passive.damageType, attackerStats, targetStats);
                extraDamage += mit.effectiveDamage;
                procLogs.push({
                    source: `${item.name} (${passive.name})`,
                    rawDamage: mit.rawDamage,
                    effectiveDamage: mit.effectiveDamage,
                    damageType: passive.damageType,
                });
            }
        }
    }
    return { extraDamage, procLogs };
}