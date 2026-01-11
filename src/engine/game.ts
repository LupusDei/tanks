import type { TankColor, TankState, TerrainData, EnemyCount, ArmorInventory, ArmorType } from '../types/game';
import { generateTerrain } from './terrain';
import { createInitialTanks } from './tank';
import { ARMORS } from './weapons';

export interface GameInitConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerColor: TankColor;
  enemyCount: EnemyCount;
  terrainSeed?: number;
}

export interface GameInitResult {
  terrain: TerrainData;
  tanks: TankState[];
}

/**
 * Initialize the game with terrain and tanks.
 * This is the main entry point for starting a new game after color selection.
 */
export function initializeGame(config: GameInitConfig): GameInitResult {
  const { canvasWidth, canvasHeight, playerColor, enemyCount, terrainSeed } = config;

  // Generate random terrain
  const terrain = generateTerrain({
    width: canvasWidth,
    height: canvasHeight,
    roughness: 0.5,
    seed: terrainSeed,
  });

  // Create tanks distributed across the terrain
  const tanks = createInitialTanks(terrain, playerColor, enemyCount);

  return { terrain, tanks };
}

/**
 * Apply armor bonuses to a tank based on its armor inventory.
 * Returns a new tank state with modified HP values.
 */
export function applyArmorToTank(tank: TankState, armorInventory: ArmorInventory): TankState {
  let maxHealth = 100;
  let shieldHp = 0;
  let maxShieldHp = 0;
  let armorType: ArmorType | null = null;

  // Check for plating armors (HP bonuses)
  if (armorInventory.heavy_plating) {
    // Heavy plating: 100% more HP
    maxHealth = 200;
    armorType = 'heavy_plating';
  } else if (armorInventory.light_plating) {
    // Light plating: 50% more HP
    maxHealth = 150;
    armorType = 'light_plating';
  }

  // Check for energy shield (separate shield HP)
  if (armorInventory.energy_shield) {
    // Energy shield: 100 shield HP
    const shieldBonus = 100 * ARMORS.energy_shield.hpBonus;
    shieldHp = shieldBonus;
    maxShieldHp = shieldBonus;
    // If we have shield, it takes precedence for visual (if no plating)
    if (!armorType) {
      armorType = 'energy_shield';
    }
  }

  return {
    ...tank,
    health: maxHealth,
    maxHealth,
    shieldHp,
    maxShieldHp,
    armorType,
  };
}

/**
 * Apply armor to all tanks based on their respective inventories.
 * For campaign mode, each tank gets their participant's armor.
 * For free play, only the player gets armor bonuses.
 */
export function applyArmorToTanks(
  tanks: TankState[],
  participantArmor: Map<string, ArmorInventory>
): TankState[] {
  return tanks.map(tank => {
    const armor = participantArmor.get(tank.id) ?? {};
    return applyArmorToTank(tank, armor);
  });
}
