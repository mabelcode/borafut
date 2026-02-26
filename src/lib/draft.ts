export interface DraftPlayer {
    id: string;
    name: string;
    position: 'GOALKEEPER' | 'DEFENSE' | 'ATTACK';
    score: number;
}

export interface DraftTeam {
    id: number;
    name: string;
    players: DraftPlayer[];
    averageScore: number;
}

export const TEAM_COLORS_CONFIG = [
    { id: 'yellow', name: 'Amarelo', bgClass: 'bg-yellow-400', borderClass: 'border-yellow-500', textClass: 'text-yellow-900' },
    { id: 'blue', name: 'Azul', bgClass: 'bg-blue-500', borderClass: 'border-blue-600', textClass: 'text-white' },
    { id: 'white', name: 'Branco', bgClass: 'bg-white', borderClass: 'border-gray-300', textClass: 'text-gray-900' },
    { id: 'red', name: 'Vermelho', bgClass: 'bg-red-500', borderClass: 'border-red-600', textClass: 'text-white' },
    { id: 'green', name: 'Verde', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-600', textClass: 'text-white' },
    { id: 'purple', name: 'Roxo', bgClass: 'bg-purple-500', borderClass: 'border-purple-600', textClass: 'text-white' },
    { id: 'orange', name: 'Laranja', bgClass: 'bg-orange-500', borderClass: 'border-orange-600', textClass: 'text-white' },
    { id: 'pink', name: 'Rosa', bgClass: 'bg-pink-500', borderClass: 'border-pink-600', textClass: 'text-white' }
];

export function getTeamColorConfig(index: number) {
    return TEAM_COLORS_CONFIG[index % TEAM_COLORS_CONFIG.length];
}
export function generateSnakeDraft(players: DraftPlayer[], numTeams: number): DraftTeam[] {
    if (numTeams < 2) throw new Error("Number of teams must be at least 2");

    // Initialize empty teams
    const teams: DraftTeam[] = Array.from({ length: numTeams }, (_, i) => ({
        id: i + 1,
        name: `Time ${i + 1}`,
        players: [],
        averageScore: 0
    }));

    // Group players by position
    const goalkeepers = players.filter(p => p.position === 'GOALKEEPER').sort((a, b) => b.score - a.score);
    const defenders = players.filter(p => p.position === 'DEFENSE').sort((a, b) => b.score - a.score);
    const attackers = players.filter(p => p.position === 'ATTACK').sort((a, b) => b.score - a.score);

    let playerIndex = 0;

    // Helper to distribute a specific group of players across teams using snake draft
    const distributeGroup = (group: DraftPlayer[]) => {
        for (const player of group) {
            // Determine snake direction based on round (0, 1, 2 = left-to-right, right-to-left, left-to-right...)
            const round = Math.floor(playerIndex / numTeams);
            const teamIndex = round % 2 === 0
                ? (playerIndex % numTeams)
                : (numTeams - 1 - (playerIndex % numTeams));

            teams[teamIndex].players.push(player);
            playerIndex++;
        }
    }

    // 1. Distribute Goleiros
    distributeGroup(goalkeepers);

    // 2. Distribute Defensores
    distributeGroup(defenders);

    // 3. Distribute Atacantes
    distributeGroup(attackers);

    // Calculate averages
    for (const team of teams) {
        if (team.players.length > 0) {
            const sum = team.players.reduce((acc, p) => acc + p.score, 0);
            team.averageScore = sum / team.players.length;
        }
    }

    return teams;
}

// Recalculates team averages after a manual swap
export function recalculateAverages(teams: DraftTeam[]): DraftTeam[] {
    return teams.map(team => {
        if (team.players.length === 0) return { ...team, averageScore: 0 };
        const sum = team.players.reduce((acc, p) => acc + p.score, 0);
        return {
            ...team,
            averageScore: sum / team.players.length
        };
    });
}
