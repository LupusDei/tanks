/**
 * Pure projectile simulation step.
 *
 * Advances every active projectile (and cluster sub-projectile) by one tick,
 * detecting terrain impacts, direct tank hits, bounces, cluster splits and
 * homing-missile tracking. It is a PURE function: no React, DOM, canvas,
 * window, performance.now, console or sound. All side-effects from the legacy
 * App.tsx render loop (damage, destruction animations, sounds, scoring, crater
 * mutation) are translated into {@link SimEvent}s for the host to apply.
 *
 * Inputs are never mutated: new projectile/explosion objects are returned.
 *
 * Ported from the projectile handling block in App.tsx (handleRender /
 * handleProjectileLanding + the projectile update loop).
 */
import type { Position, TankState } from '../../types/game';
import {
  type ProjectileState,
  type ExplosionState,
  getProjectilePosition,
  updateProjectileTrace,
  isProjectileOutOfBounds,
  checkTerrainCollision,
  handleProjectileBounce,
  updateClusterBombSplit,
  updateHomingTracking,
  findNearestTarget,
  getProjectileVisual,
  checkProjectileTankCollision,
  createExplosion,
  checkTankHit,
  getWeaponConfig,
  getInterpolatedHeightAt,
  findCollectedPowerUp,
} from '../index';
import type { SimEvent, TickContext } from './types';

/** Radius used for cluster sub-projectile direct-hit detection (matches App.tsx). */
const SUB_PROJECTILE_RADIUS = 4;

/** Result of advancing the projectile set by one tick. */
export interface StepProjectilesResult {
  /** New projectile array (same length/order as input; inputs not mutated). */
  projectiles: ProjectileState[];
  /** Explosions spawned this tick. */
  newExplosions: ExplosionState[];
  /** Events the host must apply (damage, craters, projectile resolution). */
  events: SimEvent[];
}

/**
 * Advance projectiles and detect collisions.
 *
 * @param projectiles - Current projectiles (not mutated).
 * @param ctx - Read-only tick inputs (now, wind, terrain, tanks, canvas size).
 * @returns New projectiles, spawned explosions, and reported events.
 */
export function stepProjectiles(
  projectiles: ProjectileState[],
  ctx: TickContext
): StepProjectilesResult {
  const { now, wind, terrain, canvasWidth, canvasHeight } = ctx;
  const tanks = ctx.tanks as readonly TankState[];

  const resultProjectiles: ProjectileState[] = [];
  const newExplosions: ExplosionState[] = [];
  const events: SimEvent[] = [];
  // Crates already collected this step (so one blast can't collect the same crate
  // twice, and simultaneous blasts don't double-award it).
  const collectedPowerUpIds = new Set<string>();

  /**
   * Resolve a landing/impact: spawn an explosion, optionally a crater, emit a
   * TankHit for every tank within the blast, and finally a ProjectileResolved.
   * Mirrors handleProjectileLanding in App.tsx minus all React/audio effects.
   */
  const applyImpact = (proj: ProjectileState, landingPos: Position): void => {
    const weaponConfig = getWeaponConfig(proj.weaponType);
    // Sub-projectiles use a reduced blast radius and a plain explosion (so they
    // don't recursively spawn cluster sub-explosions).
    const blastRadius = proj.isSubProjectile
      ? weaponConfig.blastRadius * 0.6
      : weaponConfig.blastRadius;
    const explosionType = proj.isSubProjectile ? 'standard' : proj.weaponType;

    newExplosions.push(
      createExplosion({ ...landingPos }, now, blastRadius, explosionType)
    );

    // Report the explosion so the host can play audio / flag explosion activity.
    events.push({
      type: 'ExplosionSpawned',
      x: landingPos.x,
      y: landingPos.y,
      weaponType: proj.weaponType,
      blastRadius,
    });

    // Power-up crate collection: if this blast overlaps an (uncollected) crate, the
    // shooter grabs it. Sub-projectiles can collect too (a cluster raining on a crate).
    if (ctx.powerUps && ctx.powerUps.length > 0) {
      const available = ctx.powerUps.filter((pu) => !collectedPowerUpIds.has(pu.id));
      const crate = findCollectedPowerUp(available, landingPos, canvasHeight, blastRadius);
      if (crate) {
        collectedPowerUpIds.add(crate.id);
        events.push({
          type: 'PowerUpCollected',
          powerUpId: crate.id,
          powerUpType: crate.type,
          tankId: proj.tankId,
          x: crate.x,
          y: crate.y,
        });
      }
    }

    // Terrain deformation. A Dirt Bomb (moundRadius) BUILDS terrain instead of
    // digging; every other impact craters the ground. Weapons with an explicit
    // craterRadius (Bunker Buster, Nuke) dig a bigger hole; all others crater in
    // proportion to their blast radius. Sub-munitions never build mounds.
    if (weaponConfig.moundRadius && !proj.isSubProjectile) {
      const moundRadius = weaponConfig.moundRadius;
      events.push({
        type: 'MoundCreated',
        x: landingPos.x,
        radius: moundRadius,
        height: weaponConfig.moundHeight ?? moundRadius * 0.5,
      });
    } else {
      const craterRadius = weaponConfig.craterRadius ?? blastRadius;
      events.push({
        type: 'CraterCreated',
        x: landingPos.x,
        radius: craterRadius,
        depth: craterRadius * 0.5,
      });
    }

    const damage = proj.isSubProjectile
      ? weaponConfig.damage * 0.6
      : weaponConfig.damage;

    for (const tank of tanks) {
      if (checkTankHit(landingPos, tank, canvasHeight, blastRadius)) {
        events.push({
          type: 'TankHit',
          tankId: tank.id,
          damage,
          weaponType: proj.weaponType,
          x: landingPos.x,
          y: landingPos.y,
          sourceTankId: proj.tankId,
        });
      }
    }

    events.push({
      type: 'ProjectileResolved',
      ownerTankId: proj.tankId,
      outOfBounds: false,
    });
  };

  /** Advance a cluster sub-projectile by one tick, returning its new state. */
  const stepSubProjectile = (sub: ProjectileState): ProjectileState => {
    if (!sub.isActive) {
      return sub;
    }

    const updatedSub = updateProjectileTrace(sub, now, wind);
    const subPos = getProjectilePosition(updatedSub, now, wind);

    // Direct hit on an enemy tank mid-flight.
    for (const tank of tanks) {
      if (tank.id === updatedSub.tankId) continue;
      if (checkProjectileTankCollision(subPos, tank, canvasHeight, SUB_PROJECTILE_RADIUS)) {
        const landed = { ...updatedSub, isActive: false };
        applyImpact(landed, subPos);
        return landed;
      }
    }

    // Sub-projectiles land (and explode) when they leave bounds / hit ground.
    const terrainHeight = getInterpolatedHeightAt(terrain, subPos.x) ?? 0;
    if (isProjectileOutOfBounds(subPos, canvasWidth, canvasHeight, terrainHeight)) {
      const landed = { ...updatedSub, isActive: false };
      applyImpact(landed, subPos);
      return landed;
    }

    return updatedSub;
  };

  for (const projectile of projectiles) {
    // Already fully resolved (inactive with no live sub-projectiles): keep as-is.
    if (!projectile.isActive && !projectile.subProjectiles?.some((s) => s.isActive)) {
      resultProjectiles.push(projectile);
      continue;
    }

    let currentProjectile = projectile;

    // Cluster bombs split near the end of their arc; the main shell then goes
    // inactive (without exploding) and spawns sub-projectiles.
    if (
      projectile.isActive &&
      projectile.weaponType === 'cluster_bomb' &&
      !projectile.hasSplit
    ) {
      currentProjectile = updateClusterBombSplit(projectile, now, wind);
    }

    // --- Main projectile handling (only while still active) ---
    if (currentProjectile.isActive) {
      let updated = updateProjectileTrace(currentProjectile, now, wind);
      let resolved = false;

      // Homing tracking (engages near end of flight). May flag a proximity
      // explosion when the missile passes its closest approach to the target.
      if (updated.weaponType === 'homing_missile' && updated.trackingStrength) {
        const pos = getProjectilePosition(updated, now, wind);
        const target = findNearestTarget(pos, [...tanks], updated.tankId, canvasHeight);
        updated = updateHomingTracking(updated, target, now, wind);

        if (updated.shouldProximityExplode) {
          currentProjectile = { ...updated, isActive: false };
          applyImpact(currentProjectile, pos);
          resolved = true;
        }
      }

      if (!resolved) {
        const position = getProjectilePosition(updated, now, wind);

        // In-flight direct hit on an enemy tank.
        const visual = getProjectileVisual(updated.weaponType);
        let directHit = false;
        for (const tank of tanks) {
          if (tank.id === updated.tankId) continue;
          if (checkProjectileTankCollision(position, tank, canvasHeight, visual.radius)) {
            directHit = true;
            break;
          }
        }

        if (directHit) {
          currentProjectile = { ...updated, isActive: false };
          applyImpact(currentProjectile, position);
        } else {
          const terrainCollision = checkTerrainCollision(position, terrain, canvasHeight);

          if (terrainCollision.hit && terrainCollision.point) {
            // Bouncing weapons reflect off the terrain until out of bounces.
            const bounced = handleProjectileBounce(
              updated,
              terrainCollision.point,
              now,
              wind
            );
            if (bounced) {
              currentProjectile = bounced;
            } else {
              currentProjectile = { ...updated, isActive: false };
              applyImpact(currentProjectile, terrainCollision.point);
            }
          } else {
            // No terrain impact: a projectile that has flown off the play area
            // simply fizzles (no explosion), reported as out of bounds.
            const terrainHeight = getInterpolatedHeightAt(terrain, position.x) ?? 0;
            if (isProjectileOutOfBounds(position, canvasWidth, canvasHeight, terrainHeight)) {
              currentProjectile = { ...updated, isActive: false };
              events.push({
                type: 'ProjectileResolved',
                ownerTankId: updated.tankId,
                outOfBounds: true,
              });
            } else {
              currentProjectile = updated;
            }
          }
        }
      }
    }

    // --- Cluster sub-projectile handling ---
    if (currentProjectile.subProjectiles && currentProjectile.subProjectiles.length > 0) {
      const updatedSubs = currentProjectile.subProjectiles.map(stepSubProjectile);
      currentProjectile = { ...currentProjectile, subProjectiles: updatedSubs };
    }

    resultProjectiles.push(currentProjectile);
  }

  return { projectiles: resultProjectiles, newExplosions, events };
}
