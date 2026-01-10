import { useUser } from '../context/UserContext'

export function PlayerStatsDisplay() {
  const { username, stats, balance } = useUser()

  if (!username || !stats) {
    return null
  }

  return (
    <div className="player-stats-display" data-testid="player-stats-display">
      <div className="player-stats-display__name" data-testid="player-stats-name">
        {username}
      </div>
      <div className="player-stats-display__stats">
        <div className="player-stats-display__stat" data-testid="player-stats-balance">
          <span className="player-stats-display__stat-value player-stats-display__stat-value--money">
            ${balance}
          </span>
          <span className="player-stats-display__stat-label">Balance</span>
        </div>
        <div className="player-stats-display__stat" data-testid="player-stats-games">
          <span className="player-stats-display__stat-value">{stats.gamesPlayed}</span>
          <span className="player-stats-display__stat-label">Games</span>
        </div>
        <div className="player-stats-display__stat" data-testid="player-stats-wins">
          <span className="player-stats-display__stat-value">{stats.gamesWon}</span>
          <span className="player-stats-display__stat-label">Wins</span>
        </div>
        <div className="player-stats-display__stat" data-testid="player-stats-winrate">
          <span className="player-stats-display__stat-value">{stats.winRate}%</span>
          <span className="player-stats-display__stat-label">Win Rate</span>
        </div>
        <div className="player-stats-display__stat" data-testid="player-stats-kills">
          <span className="player-stats-display__stat-value">{stats.totalKills}</span>
          <span className="player-stats-display__stat-label">Kills</span>
        </div>
      </div>
    </div>
  )
}
