import { describe, it, expect } from 'vitest';
import { generateSnakeDraft, recalculateAverages } from './draft';
import type { DraftPlayer } from './draft';

describe('generateSnakeDraft', () => {
    const mockPlayers: DraftPlayer[] = [
        { id: 'g1', name: 'Goleiro 1', position: 'GOALKEEPER', score: 4.5 },
        { id: 'g2', name: 'Goleiro 2', position: 'GOALKEEPER', score: 3.5 },
        { id: 'd1', name: 'Zaga 1', position: 'DEFENSE', score: 5.0 },
        { id: 'd2', name: 'Zaga 2', position: 'DEFENSE', score: 4.0 },
        { id: 'd3', name: 'Zaga 3', position: 'DEFENSE', score: 3.0 },
        { id: 'd4', name: 'Zaga 4', position: 'DEFENSE', score: 4.5 },
        { id: 'a1', name: 'Ataque 1', position: 'ATTACK', score: 5.0 },
        { id: 'a2', name: 'Ataque 2', position: 'ATTACK', score: 4.5 },
        { id: 'a3', name: 'Ataque 3', position: 'ATTACK', score: 3.5 },
        { id: 'a4', name: 'Ataque 4', position: 'ATTACK', score: 2.5 },
    ];

    it('distributes players into the correct number of teams', () => {
        const teams = generateSnakeDraft(mockPlayers, 2);

        expect(teams.length).toBe(2);
        expect(teams[0].players.length + teams[1].players.length).toBe(10);
    });

    it('distributes best players fairly between teams (snake)', () => {
        const teams = generateSnakeDraft(mockPlayers, 2);

        // Goleiro 1 (4.5) goes to Team A, Goleiro 2 (3.5) goes to Team B
        expect(teams[0].players.some(p => p.id === 'g1')).toBe(true);
        expect(teams[1].players.some(p => p.id === 'g2')).toBe(true);
    });

    it('calculates average score correctly', () => {
        const teams = generateSnakeDraft(mockPlayers, 2);

        expect(teams[0].averageScore).toBeGreaterThan(0);
        expect(teams[1].averageScore).toBeGreaterThan(0);

        // Manual verification for team 0
        const sum = teams[0].players.reduce((acc, p) => acc + p.score, 0);
        expect(teams[0].averageScore).toBeCloseTo(sum / teams[0].players.length);
    });

    it('throws error if numTeams < 2', () => {
        expect(() => generateSnakeDraft(mockPlayers, 1)).toThrow();
    });
});

describe('recalculateAverages', () => {
    it('recalculates averages when players are manually swapped', () => {
        const teams = [
            {
                id: 1, name: 'Team 1', averageScore: 0,
                players: [{ id: '1', name: 'P1', position: 'ATTACK' as const, score: 5 }]
            },
            {
                id: 2, name: 'Team 2', averageScore: 0,
                players: [{ id: '2', name: 'P2', position: 'ATTACK' as const, score: 3 }]
            }
        ];

        const recalculated = recalculateAverages(teams);
        expect(recalculated[0].averageScore).toBe(5);
        expect(recalculated[1].averageScore).toBe(3);
    });
});
