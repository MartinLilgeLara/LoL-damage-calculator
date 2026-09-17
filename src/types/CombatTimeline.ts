// [ALTERAÇÃO: Reutiliza 100% dos tipos base do seu game.ts]
import type { DamageType, ScalingRatio, ComputedUnitStats } from './game';

// [NOVO] - Pacote de dano que um hit carrega (usando o ScalingRatio do game.ts)
export interface DamagePayload {
    sourceId: string;
    sourceName: string;
    damageType: DamageType;
    baseDamage: number;
    scalings: ScalingRatio[];
    appliesOnHit?: boolean;
}

// [NOVO] - Ação macro disparada pelo jogador (ex: W com Fúria do Renekton)
export interface Action {
    id: string;
    name: string;
    castTime: number; // tempo de início da animação (segundos)
    furyCost?: number;
    furyGenerated?: number;
    hits: {
        delay: number; // atraso relativo ao castTime (ex: 0.1s, 0.25s)
        payload: DamagePayload;
    }[];
}

// [NOVO] - Evento pontual agendado na timeline discreta
export interface TimelineEvent {
    timestamp: number; // instante absoluto no tempo da simulação (ex: 0.25s)
    type: 'DAMAGE_HIT' | 'APPLY_BUFF' | 'CONSUME_RUNE';
    source: 'attacker' | 'defender';
    payload: DamagePayload;
}

// [NOVO] - Estado das runas que possuem cargas ou duração
export interface RuneState {
    bonePlating: {
        ready: boolean;
        active: boolean;
        chargesRemaining: number; // máx 3 cargas
        expiresAt: number | null; // expira 1.5s após o 1º golpe recebido
    };
    doransShield: {
        buffActive: boolean;
        buffExpiresAt: number | null;
    };
}

// [ALTERAÇÃO: Estende ComputedUnitStats em vez de reescrever do zero]
export interface ChampionCombatState extends ComputedUnitStats {
    currentHp: number;
    fury: number; // Recurso específico (Renekton)
    // Campos específicos da pipeline estrita de redução que ainda não estavam no stats base
    percentArmorReduction: number; // Ex: Black Cleaver (0 a 1)
    flatArmorReduction: number;    // Ex: Corki E
    runes?: RuneState;
}

// [NOVO] - Registro para o log detalhado hit a hit
export interface CombatLogEntry {
    timestamp: number;
    sourceName: string;
    rawDamage: number;
    mitigatedDamage: number;
    damageType: DamageType;
    absorbedByRunes: number;
    targetRemainingHp: number;
    note?: string;
}