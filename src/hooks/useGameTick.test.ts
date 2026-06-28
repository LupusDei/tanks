import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGameTick, type SimStepper } from './useGameTick';
import { createEmptySimulationState, type SimEvent, type TickContext } from '../engine/simulation';
import { generateTerrain } from '../engine';

const terrain = generateTerrain({ width: 800, height: 600, seed: 1 });
const ctx: TickContext = {
  now: 1000,
  terrain,
  tanks: [],
  wind: 0,
  canvasWidth: 800,
  canvasHeight: 600,
};

describe('useGameTick', () => {
  it('should step the simulation and return the next state (initial/happy path)', () => {
    const nextState = createEmptySimulationState();
    const step: SimStepper = vi.fn(() => ({ state: nextState, events: [] }));
    const applyEvents = vi.fn();

    const { result } = renderHook(() => useGameTick({ applyEvents, step }));
    const returned = result.current.advance(createEmptySimulationState(), 16, ctx);

    expect(step).toHaveBeenCalledTimes(1);
    expect(step).toHaveBeenCalledWith(expect.anything(), 16, ctx);
    expect(returned).toBe(nextState);
  });

  it('should drain events to applyEvents when the step produces them (state change)', () => {
    const events: SimEvent[] = [
      { type: 'MoveComplete', tankId: 'player', finalX: 200 },
      { type: 'ProjectileResolved', ownerTankId: 'player', outOfBounds: true },
    ];
    const step: SimStepper = vi.fn(() => ({ state: createEmptySimulationState(), events }));
    const applyEvents = vi.fn();

    const { result } = renderHook(() => useGameTick({ applyEvents, step }));
    result.current.advance(createEmptySimulationState(), 16, ctx);

    expect(applyEvents).toHaveBeenCalledTimes(1);
    expect(applyEvents).toHaveBeenCalledWith(events);
  });

  it('should NOT call applyEvents when there are no events (edge)', () => {
    const step: SimStepper = vi.fn(() => ({ state: createEmptySimulationState(), events: [] }));
    const applyEvents = vi.fn();

    const { result } = renderHook(() => useGameTick({ applyEvents, step }));
    result.current.advance(createEmptySimulationState(), 16, ctx);

    expect(applyEvents).not.toHaveBeenCalled();
  });

  it('should keep a stable advance identity across re-renders but use the latest applyEvents', () => {
    const stepEvents: SimEvent[] = [
      { type: 'ProjectileResolved', ownerTankId: 'p', outOfBounds: false },
    ];
    const step: SimStepper = vi.fn(() => ({
      state: createEmptySimulationState(),
      events: stepEvents,
    }));
    const first = vi.fn();
    const second = vi.fn();

    const { result, rerender } = renderHook(
      ({ cb }) => useGameTick({ applyEvents: cb, step }),
      { initialProps: { cb: first } }
    );
    const advanceA = result.current.advance;

    rerender({ cb: second });
    const advanceB = result.current.advance;

    result.current.advance(createEmptySimulationState(), 16, ctx);

    expect(advanceA).toBe(advanceB); // stable identity
    expect(first).not.toHaveBeenCalled(); // uses latest
    expect(second).toHaveBeenCalledTimes(1);
  });
});
