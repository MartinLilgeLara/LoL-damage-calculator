export type DamageType = 'physical' | 'magic' | 'true'

export type ResourceType = 'mana' | 'fury' | 'energy' | 'none';

export interface ChampionBaseStats {
    hp:number;
    hpPerLevel:number;
    hpRegen:number;
    hpRegenPerLevel:number;
    armor:number;
    armorPerLevel:number;
    magicResistance:number;
    mrPerLevel:number;
    baseAd:number;
    adPerLevel:number;
    atkSpeed:number;
    asPerLevel:number;
    resourceType?: ResourceType;
    baseResource?: number;
    resourcePerLevel?: number;
    resourceRegen?: number;
    resourceRegenPerLevel?: number;
}

export type ItemStatKey =
    | 'ad'
    | 'ap'
    | 'armor'
    | 'mr'
    | 'hp'
    | 'mana'
    | 'lethality'
    | 'flatMagicPen'
    | 'percentArmorPen'
    | 'percentMagicPen'
    | 'haste'
    | 'critChance'
    | 'critDamage'
    | 'bonusAtkSpeedPercent'
    | 'hpRegenPercent'
    | 'manaRegenPercent'
    | 'omnivamp'
    | 'lifesteal'
    | 'healAndShieldPower'
    | 'tenacity'
    | 'movementSpeed';


export type ItemCategory =
    | 'Damage'
    | 'Ability Power'
    | 'Armor'
    | 'Magic Resist'
    | 'Health'
    | 'Boots'
    | 'Critical Strike'
    | 'Attack Speed'
    | 'Ability Haste';


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
    | 'totalMana'
    | 'targetMaxHp'
    | 'targetCurrentHp'
    | 'targetMissingHp';

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
    isEmpowered?: boolean;
    furyCost?: number;
    manaCost?: number[];
    isOverTime?: boolean;
    durationSeconds?:number;
    tickInterval?:number;
    castIndex?: number;
}

export interface Skill{
    key: 'Q' | 'W' | 'E' | 'R' | 'p';
    name:string;
    maxRank:number;
    cooldown:number[];
    stages:SkillStage[];
    iconUrl?: string;
    description?: string;
    recastWindow?: number;
    maxCasts?: number;
    resetsAttackTimer?: boolean;
    appliesOnHit?: boolean;
    empowersNextAttack?: boolean;
}

export interface ActiveRecastState {
    currentCast: number;
    windowRemaining: number;
}

export type RecastStates = Record<string, ActiveRecastState>;

export interface Champion {
    id:string;
    name:string;
    baseStats:ChampionBaseStats;
    skills: Skill[];
    title?:string;
    avatarUrl?: string; // Imagem quadrada oficial do Data Dragon
    loadingUrl?: string;
}

export interface ComputedUnitStats {
    level:number;
    baseHp:number;
    bonusHp:number;
    totalHp:number;
    hpRegen:number;
    resourceType: ResourceType;
    baseResource: number;
    bonusResource: number;
    maxResource: number;
    resourceRegen: number;
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
    haste: number;
    atkSpeed: number;
    critChance: number;
    critDamage: number;
    omnivamp: number;
    lifesteal: number;
    healAndShieldPower: number;
    tenacity: number;
    movementSpeed: number;
}

export interface StatMutiplierPassive {
    id:string;
    name:string;
    category:'stat_multiplier';
    stat:'ap' | 'bonusAd' | 'totalHp' | 'armor' | 'magicResistance';
    percent: number;
    unique?:boolean;
}

export interface ProcDamagePassive{
    id:string;
    name:string;
    category:'proc_damage';
    trigger: 'spellblade' | 'on_hit' | 'on_ability_hit';
    baseDamage?:number;
    scalings: ScalingRatio[];
    damageType: DamageType;
    cooldown?: number;
    unique?:boolean;
}
export interface DotDamagePassive {
    id:string;
    name:string;
    category:'dot_burn';
    duration:number;
    tickRate:number;
    baseDamagePerSecond?: number;
    scalingsPerSecond: ScalingRatio[];
    damageType: DamageType;
    unique?: boolean;
}

export type ItemPassive =
    | StatMutiplierPassive
    | ProcDamagePassive
    | DotDamagePassive;

export interface Item {
    id:string;
    name:string;
    cost:number;
    iconUrl?: string;
    categories?: ItemCategory[];
    stats:Partial<Record<ItemStatKey,number>>;
    passives?:ItemPassive[]
}

export interface ActiveAttackEmpower {
    skillKey: 'Q' | 'W' | 'E' | 'R';
    skillName: string;
    rank: number;
    furyCost: number;
    durationRemaining: number; // Ex: 6s de janela ativa no LoL
}
export interface QueuedCombatHit {
    id: string;
    delayRemaining: number;
    sourceName: string;
    damageAmount: number;
    damageType: DamageType;
    isCritical?: boolean;
    furyGain?: number;
    healedAmount?: number;
    note?: string;
}