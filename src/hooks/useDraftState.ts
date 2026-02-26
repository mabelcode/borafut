import { useState, useCallback } from 'react';
import { type DraftTeam, generateSnakeDraft, type DraftPlayer, recalculateAverages } from '../lib/draft';

interface UseDraftStateProps {
    players: DraftPlayer[];
    initialNumTeams?: number;
}

export function useDraftState({ players, initialNumTeams = 2 }: UseDraftStateProps) {
    const [numTeams, setNumTeams] = useState(initialNumTeams);
    const [teams, setTeams] = useState<DraftTeam[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<{ teamId: number; playerId: string } | null>(null);

    // Initial draft generation
    const generateDraft = useCallback((teamsCount: number = numTeams) => {
        try {
            const draftedTeams = generateSnakeDraft(players, teamsCount);
            setTeams(draftedTeams);
            setNumTeams(teamsCount);
            setSelectedPlayer(null);
        } catch (error) {
            console.error("Error generating draft:", error);
        }
    }, [players, numTeams]);

    // Handles the Click-to-Swap logic
    const handlePlayerClick = useCallback((teamId: number, player: DraftPlayer) => {
        if (!selectedPlayer) {
            // Select first player
            setSelectedPlayer({ teamId, playerId: player.id });
        } else {
            // If clicking the same player, deselect
            if (selectedPlayer.playerId === player.id) {
                setSelectedPlayer(null);
                return;
            }

            // Perform swap
            setTeams(currentTeams => {
                const newTeams = JSON.parse(JSON.stringify(currentTeams)) as DraftTeam[];

                // Find teams
                const teamA = newTeams.find(t => t.id === selectedPlayer.teamId);
                const teamB = newTeams.find(t => t.id === teamId);

                if (!teamA || !teamB) return currentTeams;

                // Find player indices
                const p1Index = teamA.players.findIndex((p: DraftPlayer) => p.id === selectedPlayer.playerId);
                const p2Index = teamB.players.findIndex((p: DraftPlayer) => p.id === player.id);

                if (p1Index === -1 || p2Index === -1) return currentTeams;

                // Extract players
                const p1 = teamA.players[p1Index];
                const p2 = teamB.players[p2Index];

                // Swap
                teamA.players[p1Index] = p2;
                teamB.players[p2Index] = p1;

                // Return recalculated
                return recalculateAverages(newTeams);
            });

            // Reset selection
            setSelectedPlayer(null);
        }
    }, [selectedPlayer]);

    const isDraftGenerated = teams.length > 0;

    return {
        numTeams,
        setNumTeams,
        teams,
        isDraftGenerated,
        generateDraft,
        selectedPlayer,
        handlePlayerClick
    };
}
