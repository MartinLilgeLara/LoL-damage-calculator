export type DamageType = 'physical' | 'magic' | 'true'

export interface ChampionBaseStats {
    hp:number;
    hpPerLevel:number;
    armor:number;
    armorPerLevel:number;
    magicResistance:number;
    mrPerLevel:number;
    baseAd:number;
    adPerLevel:number;
    atkSpeed:number;
    asPerLevel:number;
}

export type ItemStatKey =
    | 'ad'
    | 'ap'
    | 'armor'
    | 'mr'
    | 'hp'
    | 'lethality'
    | 'flatMagicPen'
    | 'percentArmorPen'
    | 'percentMagicPen'
    | 'haste';

export type ScalingAttribute =
    | 'totalAd'
    | 'bonusAd'
    | 'baseAd'
    | 'ap'
    | 'armor'
    | 'bonusArmor'
    | 'mr'
    | 'bonusMr'
    | 'totalHp'
    | 'bonusHp'
    | 'targetMaxHp'
    | 'targetCurrentHp';

export interface ScalingRatio {
    attribute:ScalingAttribute;
    ratio: number[];
}


export interface SkillStage {
    id:string;
    name:string;
    damageType:DamageType;
    baseDamage:number[];
    scalings:ScalingRatio[];
    isOverTime?: boolean;
    durationSeconds?:number;
    tickInterval?:number;
}

export interface Skill{
    key: 'Q' | 'W' | 'E' | 'R' | 'p';
    name:string;
    maxRank:number;
    stages:SkillStage[]
}

export interface Item {
    id:string;
    name:string;
    cost:number;
    stats:Partial<Record<ItemStatKey,number>>;
    uniquePassive?:{
        name:string;
        description:string;
    };
}

export interface Champion {
    id:string;
    name:string;
    baseStats:ChampionBaseStats;
    skills: Skill[]
}

export interface ComputedUnitStats {
    level:number;
    baseHp:number;
    bonusHp:number;
    totalHp:number;
    baseAd:number;
    bonusAd:number;
    totalAd:number;
    ap:number;
    magicResistance:number;
    armor:number;
    lethality:number;
    flatMagicPen:number;
    percentArmorPen:number;
    percentMagicPen:number;
}

