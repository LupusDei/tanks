/**
 * Public API for the decoupled simulation layer.
 *
 * Imported via the subpath `engine/simulation` (NOT re-exported from the engine
 * barrel) so the step functions can keep importing reusable helpers from the
 * engine barrel without creating a circular module dependency.
 */
export * from './types';
export { createAccumulator, type Accumulator } from './timestep';
export { stepProjectiles, type StepProjectilesResult } from './stepProjectiles';
export { stepEffects } from './stepEffects';
export { stepMovement } from './stepMovement';
export { stepAmbient } from './stepAmbient';
export { stepSimulation } from './stepSimulation';
