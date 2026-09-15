export type DamageType = 'physical' | 'magic' | 'true'

export interface ChampionBaseStats {
    hp:number;
    hpPerLevel:number;
    armor:number;
    magicResistance:number;
    mrPerLevel:number;
    baseAd:number;
    adPerLevel:number;
    atkSpeed:number;
    asPerLevel:number;
}

export type StatKey =
    | 'totalAd'
    | 'bonusAd'
    | 'baseAd'
    | 'ap'
    | 'bonusHp'
    | 'totalHp'
    | 'armor'
    | 'targetMaxHp'
    | 'targetCurrentHp';

export interface ScalingRatio {
    attribute:StatKey;
    ratio: number[];
}

export interface SkillStage {
    id:string;
    name:string;
    damageType:DamageType;
    baseDamage:number[];
    scalings:ScalingRatio[];
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
    stats:Partial<Record<StatKey,number>>;
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

