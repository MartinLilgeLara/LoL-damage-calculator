import type {SkillStage, DamageType} from "../types/game.ts";

interface AttackerStats{
    level:number;
    baseAd:number;
    bonusAd:number;
    totalAd:number;
    ap:number;
    totalHp:number;
    bonusHp:number;
}

interface TargetStats{
    currentHp:number;
    maxHp:number;
    armor:number;
    mr:number;
}

export function calculateEffectiveDamage(
    stage:SkillStage,
    rank:number,
    attacker: AttackerStats,
    target: TargetStats,
): {rawDamage: number; postMitigationDamage: number}{
    const index = Math.min(rank - 1, stage.baseDamage.length - 1);
    const base = stage.baseDamage[index] ?? 0
    const scalingSum = stage.scalings.reduce((sum,s) =>{
        const coeff = s.ratio[index] ?? s.ratio[0] ?? 0;
        const statValue = attacker[s.attribute as keyof AttackerStats] ??
                                    target[s.attribute as keyof TargetStats] ?? 0;
        return sum + (statValue * coeff);
    },0);
    const rawDamage = base + scalingSum;
    let postMitigationDamage = rawDamage;
    if (stage.damageType === 'physical'){
        postMitigationDamage = rawDamage * (100 / (100 + Math.max(0, target.armor)));
    }else if (stage.damageType === 'magic'){
        postMitigationDamage = rawDamage * (100 / (100 + Math.max(0,target.mr)));
    }
    return {
        rawDamage:Math.round(rawDamage),
        postMitigationDamage: Math.round(postMitigationDamage),
    };
}