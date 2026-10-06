import { useState, useCallback } from 'react';
import type { DamageType } from '../types/game';
import type { CombatLogEntry } from '../components/Combat/CombatLog';

export interface RawLogPayload {
    source: string;
    rawDamage: number;
    effectiveDamage: number;
    damageType?: DamageType;
    isCritical?: boolean;
    // >>> [HIGHLIGHT: CAMPOS PARA TAGS E CURA] <<<
    healedAmount?: number;
    note?: string;
}

export function useCombatLog() {
    const [combatLogs, setCombatLogs] = useState<CombatLogEntry[]>([]);

    const pushCombatLogs = useCallback((logs: RawLogPayload[]) => {
        if (logs.length === 0) return;

        const now = new Date();
        const baseTime =
            now.toTimeString().split(' ')[0] +
            '.' +
            String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);

        const newEntries: CombatLogEntry[] = logs
            .filter((l) => l.effectiveDamage > 0 || (l.healedAmount ?? 0) > 0)
            .map((l, index) => ({
                id: `${Date.now()}_${Math.random()}_${index}`,
                timestamp: baseTime,
                source: l.source,
                rawDamage: Math.round(l.rawDamage),
                effectiveDamage: Math.round(l.effectiveDamage),
                damageType: l.damageType ?? 'physical',
                isCritical: l.isCritical ?? false,
                // >>> [HIGHLIGHT: REPASSE DA TAG E DA CURA] <<<
                healedAmount: l.healedAmount,
                note: l.note,
            }));

        if (newEntries.length > 0) {
            setCombatLogs((prev) => [...newEntries, ...prev]);
        }
    }, []);

    const addCombatLog = useCallback(
        (
            source: string,
            rawDamage: number,
            effectiveDamage: number,
            damageType: DamageType = 'physical',
            isCritical: boolean = false
        ) => {
            pushCombatLogs([{ source, rawDamage, effectiveDamage, damageType, isCritical }]);
        },
        [pushCombatLogs]
    );

    const clearCombatLogs = useCallback(() => setCombatLogs([]), []);

    return { combatLogs, pushCombatLogs, addCombatLog, clearCombatLogs };
}