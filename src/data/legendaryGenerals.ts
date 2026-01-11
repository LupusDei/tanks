/**
 * Legendary generals from human history for AI tank names in campaign mode.
 * Includes leaders from various eras and regions of the world.
 */

export type HistoricalEra =
  | 'Ancient'
  | 'Classical'
  | 'Medieval'
  | 'Renaissance'
  | 'Early Modern'
  | 'Modern'
  | 'Contemporary';

export interface LegendaryGeneral {
  /** Display name for the tank */
  name: string;
  /** Historical period */
  era: HistoricalEra;
  /** Country, empire, or region of origin */
  origin: string;
}

/**
 * Comprehensive list of legendary military leaders from human history.
 * Includes figures from all major civilizations and time periods.
 */
export const LEGENDARY_GENERALS: LegendaryGeneral[] = [
  // Ancient Era
  { name: 'Alexander the Great', era: 'Ancient', origin: 'Macedonia' },
  { name: 'Hannibal Barca', era: 'Ancient', origin: 'Carthage' },
  { name: 'Julius Caesar', era: 'Ancient', origin: 'Rome' },
  { name: 'Sun Tzu', era: 'Ancient', origin: 'China' },
  { name: 'Cyrus the Great', era: 'Ancient', origin: 'Persia' },
  { name: 'Leonidas', era: 'Ancient', origin: 'Sparta' },
  { name: 'Scipio Africanus', era: 'Ancient', origin: 'Rome' },
  { name: 'Xerxes', era: 'Ancient', origin: 'Persia' },
  { name: 'Ramesses II', era: 'Ancient', origin: 'Egypt' },
  { name: 'Ashoka', era: 'Ancient', origin: 'India' },

  // Classical Era
  { name: 'Attila the Hun', era: 'Classical', origin: 'Hunnic Empire' },
  { name: 'Belisarius', era: 'Classical', origin: 'Byzantine Empire' },
  { name: 'Trajan', era: 'Classical', origin: 'Rome' },
  { name: 'Marcus Aurelius', era: 'Classical', origin: 'Rome' },

  // Medieval Era
  { name: 'Genghis Khan', era: 'Medieval', origin: 'Mongolia' },
  { name: 'Saladin', era: 'Medieval', origin: 'Egypt/Syria' },
  { name: 'Richard the Lionheart', era: 'Medieval', origin: 'England' },
  { name: 'William the Conqueror', era: 'Medieval', origin: 'Normandy' },
  { name: 'Charlemagne', era: 'Medieval', origin: 'Frankish Empire' },
  { name: 'El Cid', era: 'Medieval', origin: 'Spain' },
  { name: 'Tamerlane', era: 'Medieval', origin: 'Central Asia' },
  { name: 'Kublai Khan', era: 'Medieval', origin: 'Mongolia' },
  { name: 'Baibars', era: 'Medieval', origin: 'Egypt' },
  { name: 'Subutai', era: 'Medieval', origin: 'Mongolia' },

  // Renaissance Era
  { name: 'Suleiman the Magnificent', era: 'Renaissance', origin: 'Ottoman Empire' },
  { name: 'Yi Sun-sin', era: 'Renaissance', origin: 'Korea' },
  { name: 'Oda Nobunaga', era: 'Renaissance', origin: 'Japan' },
  { name: 'Toyotomi Hideyoshi', era: 'Renaissance', origin: 'Japan' },
  { name: 'Tokugawa Ieyasu', era: 'Renaissance', origin: 'Japan' },

  // Early Modern Era
  { name: 'Napoleon Bonaparte', era: 'Early Modern', origin: 'France' },
  { name: 'Frederick the Great', era: 'Early Modern', origin: 'Prussia' },
  { name: 'Duke of Wellington', era: 'Early Modern', origin: 'Britain' },
  { name: 'Horatio Nelson', era: 'Early Modern', origin: 'Britain' },
  { name: 'George Washington', era: 'Early Modern', origin: 'United States' },
  { name: 'Shaka Zulu', era: 'Early Modern', origin: 'Zulu Kingdom' },
  { name: 'Peter the Great', era: 'Early Modern', origin: 'Russia' },
  { name: 'Gustavus Adolphus', era: 'Early Modern', origin: 'Sweden' },

  // Modern Era (19th-early 20th century)
  { name: 'Robert E. Lee', era: 'Modern', origin: 'Confederate States' },
  { name: 'Ulysses S. Grant', era: 'Modern', origin: 'United States' },
  { name: 'Stonewall Jackson', era: 'Modern', origin: 'Confederate States' },
  { name: 'William Tecumseh Sherman', era: 'Modern', origin: 'United States' },
  { name: 'Otto von Bismarck', era: 'Modern', origin: 'Prussia/Germany' },
  { name: 'Helmuth von Moltke', era: 'Modern', origin: 'Prussia' },

  // Contemporary Era (20th century)
  { name: 'George Patton', era: 'Contemporary', origin: 'United States' },
  { name: 'Erwin Rommel', era: 'Contemporary', origin: 'Germany' },
  { name: 'Douglas MacArthur', era: 'Contemporary', origin: 'United States' },
  { name: 'Dwight D. Eisenhower', era: 'Contemporary', origin: 'United States' },
  { name: 'Bernard Montgomery', era: 'Contemporary', origin: 'Britain' },
  { name: 'Georgy Zhukov', era: 'Contemporary', origin: 'Soviet Union' },
  { name: 'Heinz Guderian', era: 'Contemporary', origin: 'Germany' },
  { name: 'Chester Nimitz', era: 'Contemporary', origin: 'United States' },
  { name: 'Erich von Manstein', era: 'Contemporary', origin: 'Germany' },
  { name: 'Vo Nguyen Giap', era: 'Contemporary', origin: 'Vietnam' },
  { name: 'Moshe Dayan', era: 'Contemporary', origin: 'Israel' },
  { name: 'Norman Schwarzkopf', era: 'Contemporary', origin: 'United States' },
];

/**
 * Select a random set of unique generals for a campaign.
 * Uses Fisher-Yates shuffle for uniform distribution.
 *
 * @param count - Number of generals to select
 * @returns Array of unique legendary generals
 */
export function selectRandomGenerals(count: number): LegendaryGeneral[] {
  if (count <= 0) return [];

  // Create a shuffled copy of the array
  const shuffled = [...LEGENDARY_GENERALS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }

  // Return requested number of generals
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Get general names for a campaign (just the names, not full objects).
 *
 * @param count - Number of generals to select
 * @returns Array of general names
 */
export function getRandomGeneralNames(count: number): string[] {
  return selectRandomGenerals(count).map(g => g.name);
}

/**
 * Get the total number of available generals.
 */
export function getGeneralCount(): number {
  return LEGENDARY_GENERALS.length;
}

/**
 * Find a general by name (case-insensitive).
 */
export function findGeneralByName(name: string): LegendaryGeneral | undefined {
  const lowerName = name.toLowerCase();
  return LEGENDARY_GENERALS.find(g => g.name.toLowerCase() === lowerName);
}

/**
 * Get generals filtered by era.
 */
export function getGeneralsByEra(era: HistoricalEra): LegendaryGeneral[] {
  return LEGENDARY_GENERALS.filter(g => g.era === era);
}
