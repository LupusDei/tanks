import { AI_DIFFICULTY_CONFIGS, getChevronCount, getStarCount } from '../engine/ai';
import type { CampaignParticipant, CampaignLength, AIDifficulty } from '../types/game';
import { MagnetizeButton } from './MagnetizeButton';
import './CampaignLeaderboard.css';

interface CampaignLeaderboardProps {
  /** All campaign participants */
  participants: CampaignParticipant[];
  /** Current game number (1-indexed) */
  currentGame: number;
  /** Total number of games in campaign */
  totalGames: CampaignLength;
  /** Callback when Continue button is clicked */
  onContinue: () => void;
  /** ID of the player participant for highlighting */
  playerId?: string;
}

/**
 * Ranking comparator for campaign participants.
 * Primary: Most wins
 * Secondary: Highest K/D ratio
 * Tertiary: Most kills
 */
function rankParticipants(participants: CampaignParticipant[]): CampaignParticipant[] {
  return [...participants].sort((a, b) => {
    // Primary: Most wins (descending)
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }

    // Secondary: Highest K/D ratio (descending)
    const aKD = a.deaths === 0 ? a.kills : a.kills / a.deaths;
    const bKD = b.deaths === 0 ? b.kills : b.kills / b.deaths;
    if (bKD !== aKD) {
      return bKD - aKD;
    }

    // Tertiary: Most kills (descending)
    return b.kills - a.kills;
  });
}

/**
 * Format K/D ratio for display.
 */
function formatKD(kills: number, deaths: number): string {
  if (deaths === 0) {
    return kills === 0 ? '0.00' : `${kills.toFixed(2)}`;
  }
  return (kills / deaths).toFixed(2);
}

/**
 * Get the rank insignia display for a difficulty level.
 */
function getRankInsignia(difficulty: AIDifficulty): string {
  const chevrons = getChevronCount(difficulty);
  const stars = getStarCount(difficulty);

  if (stars > 0) {
    return '★'.repeat(stars);
  }
  if (chevrons > 0) {
    return '▲'.repeat(chevrons);
  }
  return '';
}

/**
 * Campaign leaderboard displayed after each game.
 * Shows rankings, stats, and progression for all participants.
 */
export function CampaignLeaderboard({
  participants,
  currentGame,
  totalGames,
  onContinue,
  playerId,
}: CampaignLeaderboardProps) {
  const rankedParticipants = rankParticipants(participants);
  const isCampaignComplete = currentGame > totalGames;

  // Determine the winner if campaign is complete
  const winner = isCampaignComplete ? rankedParticipants[0] : null;
  const isPlayerWinner = winner?.isPlayer ?? false;

  return (
    <div
      className="campaign-leaderboard"
      data-testid="campaign-leaderboard"
    >
      <div className="campaign-leaderboard__header">
        {isCampaignComplete ? (
          <>
            <h1
              className={`campaign-leaderboard__title campaign-leaderboard__title--${isPlayerWinner ? 'victory' : 'defeat'}`}
              data-testid="leaderboard-title"
            >
              {isPlayerWinner ? 'Victory!' : 'Campaign Over'}
            </h1>
            <p className="campaign-leaderboard__subtitle" data-testid="leaderboard-subtitle">
              {isPlayerWinner
                ? 'You dominated the battlefield!'
                : `${winner?.name ?? 'Unknown'} conquered the campaign!`}
            </p>
          </>
        ) : (
          <>
            <h1 className="campaign-leaderboard__title" data-testid="leaderboard-title">
              Campaign Standings
            </h1>
            <p className="campaign-leaderboard__subtitle" data-testid="leaderboard-subtitle">
              Game {currentGame} of {totalGames}
            </p>
          </>
        )}
      </div>

      <div className="campaign-leaderboard__table-container">
        <table className="campaign-leaderboard__table" data-testid="leaderboard-table">
          <thead>
            <tr>
              <th className="campaign-leaderboard__th--rank">#</th>
              <th className="campaign-leaderboard__th--name">Tank</th>
              <th className="campaign-leaderboard__th--record">W/G</th>
              <th className="campaign-leaderboard__th--kills">Kills</th>
              <th className="campaign-leaderboard__th--deaths">Deaths</th>
              <th className="campaign-leaderboard__th--kd">K/D</th>
              <th className="campaign-leaderboard__th--level">Rank</th>
              <th className="campaign-leaderboard__th--balance">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rankedParticipants.map((participant, index) => {
              const isPlayer = participant.id === playerId;
              const isEliminated = participant.wins === 0 && participant.gamesPlayed > 0;
              const rowClasses = [
                'campaign-leaderboard__row',
                isPlayer ? 'campaign-leaderboard__row--player' : '',
                isEliminated ? 'campaign-leaderboard__row--eliminated' : '',
                index === 0 ? 'campaign-leaderboard__row--leader' : '',
              ].filter(Boolean).join(' ');

              const levelConfig = AI_DIFFICULTY_CONFIGS[participant.currentLevel];
              const insignia = getRankInsignia(participant.currentLevel);

              return (
                <tr
                  key={participant.id}
                  className={rowClasses}
                  data-testid={`leaderboard-row-${participant.id}`}
                >
                  <td className="campaign-leaderboard__cell--rank">
                    {index + 1}
                  </td>
                  <td className="campaign-leaderboard__cell--name">
                    <span
                      className="campaign-leaderboard__color-indicator"
                      style={{ backgroundColor: participant.color }}
                    />
                    <span className="campaign-leaderboard__tank-name">
                      {participant.name}
                      {isPlayer && <span className="campaign-leaderboard__you-tag">(You)</span>}
                    </span>
                  </td>
                  <td className="campaign-leaderboard__cell--record">
                    {participant.wins}/{participant.gamesPlayed}
                  </td>
                  <td className="campaign-leaderboard__cell--kills">
                    {participant.kills}
                  </td>
                  <td className="campaign-leaderboard__cell--deaths">
                    {participant.deaths}
                  </td>
                  <td className="campaign-leaderboard__cell--kd">
                    {formatKD(participant.kills, participant.deaths)}
                  </td>
                  <td className="campaign-leaderboard__cell--level">
                    <span className="campaign-leaderboard__level-insignia">{insignia}</span>
                    <span className="campaign-leaderboard__level-name">{levelConfig.name}</span>
                  </td>
                  <td className="campaign-leaderboard__cell--balance">
                    ${participant.balance}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="campaign-leaderboard__actions">
        <MagnetizeButton
          onClick={onContinue}
          variant="primary"
          data-testid="leaderboard-continue-button"
        >
          {isCampaignComplete ? 'Finish Campaign' : 'Continue'}
        </MagnetizeButton>
      </div>
    </div>
  );
}
