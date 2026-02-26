import { Star, RefreshCw } from 'lucide-react';
import { type DraftTeam, type DraftPlayer, getTeamColorConfig } from '@/lib/draft';

interface DraftBoardProps {
    teams: DraftTeam[];
    selectedPlayer: { teamId: number; playerId: string } | null;
    onPlayerClick: (teamId: number, player: DraftPlayer) => void;
}

export default function DraftBoard({ teams, selectedPlayer, onPlayerClick }: DraftBoardProps) {
    return (
        <div className="flex flex-col gap-4 animate-fade-in">
            {/* Context tip for Admin */}
            <div className="bg-brand-green/10 text-brand-green rounded-xl p-3 flex gap-3 text-sm border border-brand-green/20 items-center">
                <RefreshCw size={20} className="shrink-0" />
                <p className="leading-snug">
                    <strong>Sorteio equilibrado gerado!</strong> Clique em dois jogadores de times diferentes para trocá-los de lugar manualmente se necessário.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teams.map((team, tIdx) => {
                    const colorConfig = getTeamColorConfig(tIdx);

                    return (
                        <div key={team.id} className={`rounded-2xl border-2 flex flex-col overflow-hidden shadow-sm transition-all bg-surface border-gray-100`}>
                            <div className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className={`size-3.5 rounded-sm border shadow-sm ${colorConfig.bgClass} ${colorConfig.borderClass}`} title={colorConfig.name} />
                                    <h3 className="font-bold uppercase tracking-widest text-sm text-primary-text">{team.name}</h3>
                                </div>
                                <div className="flex items-center gap-1.5 font-bold text-xs bg-white text-secondary-text px-2 py-1 rounded-lg border border-gray-200 shadow-sm">
                                    <Star size={12} className="text-amber-400 fill-amber-400" />
                                    Média: {team.averageScore.toFixed(1)}
                                </div>
                            </div>

                            <div className="p-2 flex flex-col gap-1.5 bg-gray-50/50">
                                {team.players.map((player) => {
                                    const isSelected = selectedPlayer?.playerId === player.id;
                                    const isOtherSelected = selectedPlayer && selectedPlayer.playerId !== player.id;

                                    return (
                                        <button
                                            key={player.id}
                                            onClick={() => onPlayerClick(team.id, player)}
                                            className={`
                                                flex items-center justify-between p-2.5 rounded-xl border-2 transition-all 
                                                text-left w-full relative overflow-hidden group
                                                ${isSelected
                                                    ? `bg-white border-brand-green shadow-md scale-[1.02] z-10`
                                                    : isOtherSelected
                                                        ? 'bg-white/60 border-transparent hover:border-dashed hover:border-gray-400'
                                                        : 'bg-white border-transparent hover:border-gray-200 shadow-sm'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs bg-gray-100 text-gray-600`}>
                                                    {player.name[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-bold truncate max-w-[120px] sm:max-w-[180px] ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                                        {player.name}
                                                    </span>
                                                    <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 mt-0.5">
                                                        {player.position}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={`flex items-center gap-1 font-bold text-xs ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                                                {player.score.toFixed(1)}
                                                <Star size={10} className={isSelected ? 'fill-gray-900 text-gray-900' : 'text-gray-300'} />
                                            </div>

                                            {/* Swap indicators */}
                                            {isSelected && (
                                                <div className="absolute inset-0 border-2 rounded-xl pointer-events-none animate-pulse opacity-50 border-brand-green" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                        </div>
                    );
                })}
            </div>
        </div>
    );
}
