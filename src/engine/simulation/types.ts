/**
 * Core data contract for the decoupled, fixed-timestep simulation.
 *
 * The simulation is a set of PURE functions (no React, no DOM, no canvas) that
 * take a {@link SimulationState} plus a {@link TickContext} and return a new
 * state plus a list of {@link SimEvent}s. Events are the seam between the pure
 * simulation and the React/UI layer: the host (useGameTick / App) drains them
 * once per frame and applies them to React state via existing actions.
 *
 * `SimulationState` mirrors the per-frame mutable refs previously held in
 * App.tsx (projectilesRef, explosionsRef, destructionsRef, moneyAnimationsRef,
 * windParticlesRef).
 */
import type {
  ProjectileState,
  ExplosionState,
  TankDestructionState,
  MoneyAnimationState,
  WindParticleSystemState,
} from '../index';
import type { TankState, TerrainData, WeaponType } from '../../types/game';

/** All transient per-frame simulation data (previously App.tsx refs). */
export interface SimulationState {
  projectiles: ProjectileState[];
  explosions: ExplosionState[];
  destructions: TankDestructionState[];
  moneyAnimations: MoneyAnimationState[];
  windParticles: WindParticleSystemState | null;
}

/**
 * Read-only inputs a simulation step needs but does not own. Tanks and terrain
 * live in React state; the step reads them and reports changes back via events
 * (or, for movement, via returned tank updates) rather than mutating them.
 */
export interface TickContext {
  terrain: TerrainData;
  tanks: readonly TankState[];
  /** Current wind value (signed m/s). */
  wind: number;
  canvasWidth: number;
  canvasHeight: number;
  /** Absolute timestamp (ms) of the current simulation step, for time-based logic. */
  now: number;
}

/** A projectile dealt blast damage to a tank within its radius. */
export interface TankHitEvent {
  type: 'TankHit';
  tankId: string;
  damage: number;
  weaponType: WeaponType;
  /** Impact point (world coords). */
  x: number;
  y: number;
  /** Tank that fired the projectile, if known. */
  sourceTankId?: string;
}

/** A tank's health reached 0 this step. */
export interface TankDestroyedEvent {
  type: 'TankDestroyed';
  tankId: string;
  weaponType: WeaponType;
  /** Tank credited with the kill, if known. */
  killerTankId?: string;
}

/** A tank finished its movement animation at `finalX`. */
export interface MoveCompleteEvent {
  type: 'MoveComplete';
  tankId: string;
  finalX: number;
}

/**
 * An explosion was spawned at an impact point. Carries what the host needs to
 * play weapon-appropriate audio and flag explosion activity; the explosion's
 * VISUAL is already added to {@link SimulationState.explosions} by the step.
 */
export interface ExplosionSpawnedEvent {
  type: 'ExplosionSpawned';
  x: number;
  y: number;
  weaponType: WeaponType;
  blastRadius: number;
}

/** A projectile finished its flight (impact or out of bounds) and was removed. */
export interface ProjectileResolvedEvent {
  type: 'ProjectileResolved';
  /** Owner tank id (projectiles are keyed by their firing tank). */
  ownerTankId: string;
  /** True if the projectile left the play area without exploding. */
  outOfBounds: boolean;
}

/** A weapon deformed the terrain; the host must update terrain + invalidate caches. */
export interface CraterCreatedEvent {
  type: 'CraterCreated';
  x: number;
  radius: number;
  depth: number;
}

/** Discriminated union of everything the pure simulation reports to the host. */
export type SimEvent =
  | TankHitEvent
  | TankDestroyedEvent
  | MoveCompleteEvent
  | ExplosionSpawnedEvent
  | ProjectileResolvedEvent
  | CraterCreatedEvent;

/** Standard return shape for a simulation step. */
export interface StepResult {
  state: SimulationState;
  events: SimEvent[];
}

/** Create an empty simulation state (no projectiles, effects, or particles). */
export function createEmptySimulationState(): SimulationState {
  return {
    projectiles: [],
    explosions: [],
    destructions: [],
    moneyAnimations: [],
    windParticles: null,
  };
}

/** True when the state has no active projectiles, explosions, or destructions. */
export function isSimulationIdle(state: SimulationState): boolean {
  return (
    state.projectiles.length === 0 &&
    state.explosions.length === 0 &&
    state.destructions.length === 0
  );
}

// --- Type guards (narrow a SimEvent to a concrete variant) ---

export const isTankHit = (e: SimEvent): e is TankHitEvent => e.type === 'TankHit';
export const isTankDestroyed = (e: SimEvent): e is TankDestroyedEvent =>
  e.type === 'TankDestroyed';
export const isMoveComplete = (e: SimEvent): e is MoveCompleteEvent =>
  e.type === 'MoveComplete';
export const isExplosionSpawned = (e: SimEvent): e is ExplosionSpawnedEvent =>
  e.type === 'ExplosionSpawned';
export const isProjectileResolved = (e: SimEvent): e is ProjectileResolvedEvent =>
  e.type === 'ProjectileResolved';
export const isCraterCreated = (e: SimEvent): e is CraterCreatedEvent =>
  e.type === 'CraterCreated';
