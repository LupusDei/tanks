import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameConfigScreen } from './GameConfigScreen';

// Isolate the config screen from the user context + persistence.
vi.mock('./PlayerStatsDisplay', () => ({ PlayerStatsDisplay: () => null }));
vi.mock('../services/userDatabase', () => ({
  loadGameConfig: () => null,
  saveGameConfig: vi.fn(),
}));

describe('GameConfigScreen — Easy Mode toggle (tanks-304.3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should default Easy Mode OFF and pass easyMode:false to onStartGame (happy path)', () => {
    const onStartGame = vi.fn();
    render(<GameConfigScreen onStartGame={onStartGame} />);

    const toggle = screen.getByTestId('config-easy-mode-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('config-engage-button'));
    expect(onStartGame).toHaveBeenCalledWith(expect.objectContaining({ easyMode: false }));
  });

  it('should toggle Easy Mode ON and pass easyMode:true to onStartGame (state change)', () => {
    const onStartGame = vi.fn();
    render(<GameConfigScreen onStartGame={onStartGame} />);

    fireEvent.click(screen.getByTestId('config-easy-mode-toggle'));
    expect(screen.getByTestId('config-easy-mode-toggle')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('config-engage-button'));
    expect(onStartGame).toHaveBeenCalledWith(expect.objectContaining({ easyMode: true }));
  });

  it('should toggle back OFF when clicked twice (edge)', () => {
    const onStartGame = vi.fn();
    render(<GameConfigScreen onStartGame={onStartGame} />);

    const toggle = screen.getByTestId('config-easy-mode-toggle');
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByTestId('config-engage-button'));
    expect(onStartGame).toHaveBeenCalledWith(expect.objectContaining({ easyMode: false }));
  });
});
