import type { Champion, Item, SkillStage, ComputedUnitStats, DamageType } from '../types/game';
import { mitigateDamage } from './mitigation';

export function calculateEffectiveDamage(
    stage: SkillStage,
    rank: number,
    attacker: ComputedUnitStats,
    target: ComputedUnitStats,
    targetCurrentHp?: number
): { rawDamage: number; effectiveDamage: number; damageType: DamageType } {
    const rankIdx = Math.min(rank - 1, stage.baseDamage.length - 1);
    const base = stage.baseDamage[rankIdx] ?? 0;

    const currentHp = targetCurrentHp !== undefined ? targetCurrentHp : target.totalHp;
    const missingHp = Math.max(0, target.totalHp - currentHp);

    const scaling = stage.scalings.reduce((sum, s) => {
        const coeff = s.ratio[rankIdx] ?? s.ratio[0] ?? 0;
        switch (s.attribute) {
            case 'totalAd':
                return sum + attacker.totalAd * coeff;
            case 'bonusAd':
                return sum + attacker.bonusAd * coeff;
            case 'baseAd':
                return sum + attacker.baseAd * coeff;
            case 'ap':
                return sum + attacker.ap * coeff;
            case 'totalHp':
                return sum + attacker.totalHp * coeff;
            case 'bonusHp':
                return sum + attacker.bonusHp * coeff;
            case 'targetMaxHp':
                return sum + target.totalHp * coeff;
            case 'targetCurrentHp':
                return sum + currentHp * coeff;
            case 'targetMissingHp':
                return sum + missingHp * coeff;
            default:
                return sum;
        }
    }, 0);

    const rawDamage = base + scaling;

    // Delega o cálculo de mitigação de resistências diretamente para a função pura
    return mitigateDamage(rawDamage, stage.damageType, attacker, target);
}

export function calculateStatAtLevel(base: number, growth: number, level: number): number {
    if (level <= 1) return base;
    const factor = (level - 1) * (0.7025 + 0.0175 * (level - 1));
    return base + growth * factor;
}

export function computeUnitStats(
    champion: Champion,
    level: number,
    items: (Item | null)[]
): ComputedUnitStats {
    const baseHp = calculateStatAtLevel(champion.baseStats.hp, champion.baseStats.hpPerLevel, level);
    const baseAd = calculateStatAtLevel(champion.baseStats.baseAd, champion.baseStats.adPerLevel, level);
    const baseArmor = calculateStatAtLevel(champion.baseStats.armor, champion.baseStats.armorPerLevel, level);
    const baseMr = calculateStatAtLevel(champion.baseStats.magicResistance, champion.baseStats.mrPerLevel, level);
    const resourceType = champion.baseStats.resourceType ?? 'none';
    const baseHpRegen = calculateStatAtLevel(champion.baseStats.hpRegen, champion.baseStats.hpRegenPerLevel, level);
    const baseResourceRegen = calculateStatAtLevel(
        champion.baseStats.resourceRegen ?? 0,
        champion.baseStats.resourceRegenPerLevel ?? 0,
        level
    );
    let baseResource = 0;
    if (resourceType === 'fury') {
        baseResource = 100;
    } else if (resourceType === 'mana') {
        baseResource = calculateStatAtLevel(
            champion.baseStats.baseResource ?? 0,
            champion.baseStats.resourcePerLevel ?? 0,
            level
        );
    }
    let bonusHp = 0;
    let bonusAd = 0;
    let bonusResource = 0;
    let ap = 0;
    let bonusArmor = 0;
    let bonusMr = 0;
    let lethality = 0;
    let flatMagicPen = 0;
    let percentArmorPen = 0;
    let percentMagicPen = 0;
    let haste = 0;
    let critChance = 0;
    let bonusCritDamage = 0;
    let bonusAtkSpeedPercent = 0;
    for (const item of items) {
        if (!item) continue;
        bonusHp += item.stats.hp ?? 0;
        bonusResource += item.stats.mana ?? 0;
        bonusAd += item.stats.ad ?? 0;
        ap += item.stats.ap ?? 0;
        bonusArmor += item.stats.armor ?? 0;
        bonusMr += item.stats.mr ?? 0;
        lethality += item.stats.lethality ?? 0;
        flatMagicPen += item.stats.flatMagicPen ?? 0;
        percentArmorPen += item.stats.percentArmorPen ?? 0;
        percentMagicPen += item.stats.percentMagicPen ?? 0;
        haste += item.stats.haste ?? 0;
        critChance += item.stats.critChance ?? 0;
        bonusCritDamage += item.stats.critDamage ?? 0;
        bonusAtkSpeedPercent += item.stats.bonusAtkSpeedPercent ?? 0;
    }
    const asGrowthFactor = (level - 1) * (0.7025 + 0.0175 * (level - 1));
    const totalBonusAs = (champion.baseStats.asPerLevel * asGrowthFactor) + bonusAtkSpeedPercent;
    const computedAtkSpeed = Number(
        (champion.baseStats.atkSpeed * (1 + totalBonusAs / 100)).toFixed(3)
    );
    const maxResource = resourceType === 'fury' ? 100 : Math.round(baseResource + bonusResource);
    return {
        level,
        baseHp: Math.round(baseHp),
        bonusHp,
        totalHp: Math.round(baseHp + bonusHp),
        hpRegen: Number(baseHpRegen.toFixed(2)),
        resourceType,
        baseResource: Math.round(baseResource),
        bonusResource: resourceType === 'fury' ? 0 : bonusResource,
        maxResource,
        resourceRegen: resourceType === 'fury' || resourceType === 'none' ? 0 : Number(baseResourceRegen.toFixed(2)),
        baseAd: Math.round(baseAd),
        bonusAd,
        totalAd: Math.round(baseAd + bonusAd),
        ap,
        armor: Math.round(baseArmor + bonusArmor),
        magicResistance: Math.round(baseMr + bonusMr),
        lethality,
        flatMagicPen,
        percentArmorPen,
        percentMagicPen,
        haste,
        atkSpeed: computedAtkSpeed,
        critChance: Math.min(100, critChance),
        critDamage: 175 + bonusCritDamage,
    };
}