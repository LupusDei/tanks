import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CampaignLeaderboard } from './CampaignLeaderboard';
import type { CampaignParticipant } from '../types/game';

const createParticipant = (overrides: Partial<CampaignParticipant> = {}): CampaignParticipant => ({
  id: 'participant-1',
  name: 'Test Tank',
  isPlayer: false,
  balance: 500,
  kills: 0,
  deaths: 0,
  gamesPlayed: 0,
  wins: 0,
  currentLevel: 'veteran',
  weaponInventory: { standard: Infinity },
  armorInventory: {},
  color: 'red',
  ...overrides,
});

describe('CampaignLeaderboard', () => {
  it('renders the leaderboard with title and subtitle', () => {
    render(
      <CampaignLeaderboard
        participants={[createParticipant()]}
        currentGame={1}
        totalGames={5}
        onContinue={() => {}}
      />
    );

    expect(screen.getByTestId('campaign-leaderboard')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-title')).toHaveTextContent('Campaign Standings');
    expect(screen.getByTestId('leaderboard-subtitle')).toHaveTextContent('Game 1 of 5');
  });

  it('renders all participants in the table', () => {
    const participants = [
      createParticipant({ id: 'player', name: 'Player', isPlayer: true }),
      createParticipant({ id: 'ai-1', name: 'General Patton' }),
      createParticipant({ id: 'ai-2', name: 'General Rommel' }),
    ];

    render(
      <CampaignLeaderboard
        participants={participants}
        currentGame={2}
        totalGames={5}
        onContinue={() => {}}
        playerId="player"
      />
    );

    expect(screen.getByTestId('leaderboard-row-player')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-row-ai-1')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-row-ai-2')).toBeInTheDocument();
  });

  it('ranks participants by wins (primary)', () => {
    const participants = [
      createParticipant({ id: 'loser', name: 'Loser', wins: 0, gamesPlayed: 3 }),
      createParticipant({ id: 'winner', name: 'Winner', wins: 3, gamesPlayed: 3 }),
      createParticipant({ id: 'middle', name: 'Middle', wins: 1, gamesPlayed: 3 }),
    ];

    render(
      <CampaignLeaderboard
        participants={participants}
        currentGame={3}
        totalGames={5}
        onContinue={() => {}}
      />
    );

    const rows = screen.getAllByTestId(/^leaderboard-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'leaderboard-row-winner');
    expect(rows[1]).toHaveAttribute('data-testid', 'leaderboard-row-middle');
    expect(rows[2]).toHaveAttribute('data-testid', 'leaderboard-row-loser');
  });

  it('ranks by K/D ratio when wins are equal', () => {
    const participants = [
      createParticipant({ id: 'bad-kd', name: 'Bad KD', wins: 1, kills: 1, deaths: 3 }),
      createParticipant({ id: 'good-kd', name: 'Good KD', wins: 1, kills: 5, deaths: 1 }),
    ];

    render(
      <CampaignLeaderboard
        participants={participants}
        currentGame={2}
        totalGames={5}
        onContinue={() => {}}
      />
    );

    const rows = screen.getAllByTestId(/^leaderboard-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'leaderboard-row-good-kd');
    expect(rows[1]).toHaveAttribute('data-testid', 'leaderboard-row-bad-kd');
  });

  it('ranks by kills when wins and K/D are equal', () => {
    const participants = [
      createParticipant({ id: 'few-kills', name: 'Few Kills', wins: 1, kills: 2, deaths: 2 }),
      createParticipant({ id: 'many-kills', name: 'Many Kills', wins: 1, kills: 5, deaths: 5 }),
    ];

    render(
      <CampaignLeaderboard
        participants={participants}
        currentGame={2}
        totalGames={5}
        onContinue={() => {}}
      />
    );

    const rows = screen.getAllByTestId(/^leaderboard-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'leaderboard-row-many-kills');
    expect(rows[1]).toHaveAttribute('data-testid', 'leaderboard-row-few-kills');
  });

  it('highlights the player row', () => {
    const participants = [
      createParticipant({ id: 'player', name: 'Player', isPlayer: true }),
      createParticipant({ id: 'ai-1', name: 'AI Tank' }),
    ];

    render(
      <CampaignLeaderboard
        participants={participants}
        currentGame={1}
        totalGames={5}
        onContinue={() => {}}
        playerId="player"
      />
    );

    const playerRow = screen.getByTestId('leaderboard-row-player');
    expect(playerRow).toHaveClass('campaign-leaderboard__row--player');
    expect(playerRow).toHaveTextContent('(You)');
  });

  it('calls onContinue when Continue button is clicked', () => {
    const handleContinue = vi.fn();

    render(
      <CampaignLeaderboard
        participants={[createParticipant()]}
        currentGame={2}
        totalGames={5}
        onContinue={handleContinue}
      />
    );

    fireEvent.click(screen.getByTestId('leaderboard-continue-button'));
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it('shows Continue button during campaign', () => {
    render(
      <CampaignLeaderboard
        participants={[createParticipant()]}
        currentGame={3}
        totalGames={5}
        onContinue={() => {}}
      />
    );

    expect(screen.getByTestId('leaderboard-continue-button')).toHaveTextContent('Continue');
  });

  describe('Campaign Complete', () => {
    it('shows victory message when player wins campaign', () => {
      const participants = [
        createParticipant({ id: 'player', name: 'Player', isPlayer: true, wins: 4 }),
        createParticipant({ id: 'ai-1', name: 'AI Tank', wins: 1 }),
      ];

      render(
        <CampaignLeaderboard
          participants={participants}
          currentGame={6} // After 5 games, currentGame would be 6
          totalGames={5}
          onContinue={() => {}}
          playerId="player"
        />
      );

      expect(screen.getByTestId('leaderboard-title')).toHaveTextContent('Victory!');
      expect(screen.getByTestId('leaderboard-subtitle')).toHaveTextContent('You dominated the battlefield!');
    });

    it('shows defeat message when AI wins campaign', () => {
      const participants = [
        createParticipant({ id: 'player', name: 'Player', isPlayer: true, wins: 1 }),
        createParticipant({ id: 'ai-1', name: 'General Patton', wins: 4 }),
      ];

      render(
        <CampaignLeaderboard
          participants={participants}
          currentGame={6}
          totalGames={5}
          onContinue={() => {}}
          playerId="player"
        />
      );

      expect(screen.getByTestId('leaderboard-title')).toHaveTextContent('Campaign Over');
      expect(screen.getByTestId('leaderboard-subtitle')).toHaveTextContent('General Patton conquered the campaign!');
    });

    it('shows Finish Campaign button when campaign is complete', () => {
      render(
        <CampaignLeaderboard
          participants={[createParticipant({ wins: 3 })]}
          currentGame={6}
          totalGames={5}
          onContinue={() => {}}
        />
      );

      expect(screen.getByTestId('leaderboard-continue-button')).toHaveTextContent('Finish Campaign');
    });
  });

  describe('Stats display', () => {
    it('displays wins/games record correctly', () => {
      const participants = [
        createParticipant({ id: 'tank', name: 'Tank', wins: 3, gamesPlayed: 5 }),
      ];

      render(
        <CampaignLeaderboard
          participants={participants}
          currentGame={5}
          totalGames={5}
          onContinue={() => {}}
        />
      );

      const row = screen.getByTestId('leaderboard-row-tank');
      expect(row).toHaveTextContent('3/5');
    });

    it('displays kills and deaths correctly', () => {
      const participants = [
        createParticipant({ id: 'tank', name: 'Tank', kills: 10, deaths: 3 }),
      ];

      render(
        <CampaignLeaderboard
          participants={participants}
          currentGame={3}
          totalGames={5}
          onContinue={() => {}}
        />
      );

      const row = screen.getByTestId('leaderboard-row-tank');
      expect(row).toHaveTextContent('10'); // kills
      expect(row).toHaveTextContent('3'); // deaths
    });

    it('calculates K/D ratio correctly', () => {
      const participants = [
        createParticipant({ id: 'tank', name: 'Tank', kills: 10, deaths: 4 }),
      ];

      render(
        <CampaignLeaderboard
          participants={participants}
          currentGame={3}
          totalGames={5}
          onContinue={() => {}}
        />
      );

      const row = screen.getByTestId('leaderboard-row-tank');
      expect(row).toHaveTextContent('2.50'); // 10/4 = 2.5
    });

    it('handles zero deaths in K/D ratio', () => {
      const participants = [
        createParticipant({ id: 'tank', name: 'Tank', kills: 5, deaths: 0 }),
      ];

      render(
        <CampaignLeaderboard
          participants={participants}
          currentGame={2}
          totalGames={5}
          onContinue={() => {}}
        />
      );

      const row = screen.getByTestId('leaderboard-row-tank');
      expect(row).toHaveTextContent('5.00');
    });

    it('displays balance with dollar sign', () => {
      const participants = [
        createParticipant({ id: 'tank', name: 'Tank', balance: 1250 }),
      ];

      render(
        <CampaignLeaderboard
          participants={participants}
          currentGame={3}
          totalGames={5}
          onContinue={() => {}}
        />
      );

      const row = screen.getByTestId('leaderboard-row-tank');
      expect(row).toHaveTextContent('$1250');
    });

    it('displays difficulty rank with name', () => {
      const participants = [
        createParticipant({ id: 'tank', name: 'Tank', currentLevel: 'centurion' }),
      ];

      render(
        <CampaignLeaderboard
          participants={participants}
          currentGame={3}
          totalGames={5}
          onContinue={() => {}}
        />
      );

      const row = screen.getByTestId('leaderboard-row-tank');
      expect(row).toHaveTextContent('Centurion');
    });
  });

  it('displays tank color indicator', () => {
    const participants = [
      createParticipant({ id: 'tank', name: 'Tank', color: 'blue' }),
    ];

    const { container } = render(
      <CampaignLeaderboard
        participants={participants}
        currentGame={2}
        totalGames={5}
        onContinue={() => {}}
      />
    );

    const colorIndicator = container.querySelector('.campaign-leaderboard__color-indicator');
    expect(colorIndicator).toBeInTheDocument();
    expect(colorIndicator).toHaveAttribute('style', 'background-color: blue;');
  });

  it('marks the leader row with special styling', () => {
    const participants = [
      createParticipant({ id: 'leader', name: 'Leader', wins: 3 }),
      createParticipant({ id: 'follower', name: 'Follower', wins: 1 }),
    ];

    render(
      <CampaignLeaderboard
        participants={participants}
        currentGame={4}
        totalGames={5}
        onContinue={() => {}}
      />
    );

    const leaderRow = screen.getByTestId('leaderboard-row-leader');
    expect(leaderRow).toHaveClass('campaign-leaderboard__row--leader');

    const followerRow = screen.getByTestId('leaderboard-row-follower');
    expect(followerRow).not.toHaveClass('campaign-leaderboard__row--leader');
  });
});
