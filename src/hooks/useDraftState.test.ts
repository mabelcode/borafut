import { renderHook, act } from '@testing-library/react';
import { useDraftState } from './useDraftState';
import { describe, it, expect } from 'vitest';
import type { DraftPlayer } from '../lib/draft';

describe('useDraftState', () => {
    const mockPlayers: DraftPlayer[] = [
        { id: '1', name: 'Goleiro 1', position: 'GOALKEEPER', score: 5 },
        { id: '2', name: 'Goleiro 2', position: 'GOALKEEPER', score: 4 },
        { id: '3', name: 'Zagueiro 1', position: 'DEFENSE', score: 4.5 },
        { id: '4', name: 'Zagueiro 2', position: 'DEFENSE', score: 3.5 },
        { id: '5', name: 'Atacante 1', position: 'ATTACK', score: 5 },
        { id: '6', name: 'Atacante 2', position: 'ATTACK', score: 4 }
    ];

    it('should initialize with correct default state', () => {
        const { result } = renderHook(() => useDraftState({ players: mockPlayers }));

        expect(result.current.numTeams).toBe(2);
        expect(result.current.teams).toEqual([]);
        expect(result.current.isDraftGenerated).toBe(false);
        expect(result.current.selectedPlayer).toBeNull();
    });

    it('should initialize with provided initialNumTeams', () => {
        const { result } = renderHook(() => useDraftState({ players: mockPlayers, initialNumTeams: 3 }));
        expect(result.current.numTeams).toBe(3);
    });

    it('should generate draft correctly', () => {
        const { result } = renderHook(() => useDraftState({ players: mockPlayers, initialNumTeams: 2 }));

        act(() => {
            result.current.generateDraft();
        });

        expect(result.current.isDraftGenerated).toBe(true);
        expect(result.current.teams.length).toBe(2);
        expect(result.current.teams[0].players.length).toBe(3); // 1 G, 1 Z, 1 A
        expect(result.current.teams[1].players.length).toBe(3);
    });

    it('should handle player click to select and deselect', () => {
        const { result } = renderHook(() => useDraftState({ players: mockPlayers }));

        act(() => {
            result.current.generateDraft();
        });

        const firstTeam = result.current.teams[0];
        const firstPlayer = firstTeam.players[0];

        // Select player
        act(() => {
            result.current.handlePlayerClick(firstTeam.id, firstPlayer);
        });

        expect(result.current.selectedPlayer).toEqual({ teamId: firstTeam.id, playerId: firstPlayer.id });

        // Deselect same player
        act(() => {
            result.current.handlePlayerClick(firstTeam.id, firstPlayer);
        });

        expect(result.current.selectedPlayer).toBeNull();
    });

    it('should swap players between teams', () => {
        const { result } = renderHook(() => useDraftState({ players: mockPlayers }));

        act(() => {
            result.current.generateDraft();
        });

        const firstTeam = result.current.teams[0];
        const secondTeam = result.current.teams[1];

        const player1 = firstTeam.players[0];
        const player2 = secondTeam.players[0];

        // Ensure they are different before swap
        expect(player1.id).not.toBe(player2.id);

        // Click player 1
        act(() => {
            result.current.handlePlayerClick(firstTeam.id, player1);
        });

        // Click player 2
        act(() => {
            result.current.handlePlayerClick(secondTeam.id, player2);
        });

        // They should be swapped
        expect(result.current.selectedPlayer).toBeNull(); // Reset

        const newFirstTeam = result.current.teams[0];
        const newSecondTeam = result.current.teams[1];

        // player2 should now be in first team
        expect(newFirstTeam.players.find(p => p.id === player2.id)).toBeDefined();
        // player1 should now be in second team
        expect(newSecondTeam.players.find(p => p.id === player1.id)).toBeDefined();
    });
});
