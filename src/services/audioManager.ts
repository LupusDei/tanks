/**
 * Audio Manager Service
 *
 * Manages all game audio including background music, sound effects, and UI sounds.
 * Uses the Web Audio API for precise timing and control.
 */

import type { WeaponType } from '../engine/weapons';

// Storage key for audio preferences
const AUDIO_PREFS_KEY = 'tanks_audio_prefs';

// Sound categories for volume control
export type SoundCategory = 'music' | 'sfx' | 'ui';

// Sound types for each category
export type MusicTrack = 'menu' | 'gameplay' | 'victory' | 'defeat';

export type SfxType =
  | 'fire_standard'
  | 'fire_heavy'
  | 'fire_precision'
  | 'fire_cluster'
  | 'fire_napalm'
  | 'fire_emp'
  | 'fire_bouncing'
  | 'fire_bunker'
  | 'fire_homing'
  | 'explosion_small'
  | 'explosion_medium'
  | 'explosion_large'
  | 'explosion_fire'
  | 'explosion_electric'
  | 'tank_destruction'
  | 'tank_hit'
  | 'money_earned';

export type UiSoundType = 'hover' | 'click' | 'purchase' | 'error' | 'turn_change';

// Audio preferences interface
export interface AudioPreferences {
  masterVolume: number; // 0-1
  musicVolume: number; // 0-1
  sfxVolume: number; // 0-1
  uiVolume: number; // 0-1
  muted: boolean;
}

// Default audio preferences
const DEFAULT_PREFERENCES: AudioPreferences = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.8,
  uiVolume: 0.6,
  muted: false,
};

// Sound definition interface
interface SoundDefinition {
  url: string;
  volume?: number; // Base volume multiplier (0-1)
  loop?: boolean;
}

// Map weapon types to firing sounds
export function getFireSoundForWeapon(weaponType: WeaponType): SfxType {
  const mapping: Record<WeaponType, SfxType> = {
    standard: 'fire_standard',
    heavy_artillery: 'fire_heavy',
    precision: 'fire_precision',
    cluster_bomb: 'fire_cluster',
    napalm: 'fire_napalm',
    emp: 'fire_emp',
    bouncing_betty: 'fire_bouncing',
    bunker_buster: 'fire_bunker',
    homing_missile: 'fire_homing',
  };
  return mapping[weaponType] || 'fire_standard';
}

// Map explosion size to sound
export function getExplosionSound(blastRadius: number, isFireType = false, isElectricType = false): SfxType {
  if (isElectricType) return 'explosion_electric';
  if (isFireType) return 'explosion_fire';
  if (blastRadius >= 30) return 'explosion_large';
  if (blastRadius >= 20) return 'explosion_medium';
  return 'explosion_small';
}

/**
 * Audio Manager class
 * Singleton that manages all game audio
 */
class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private uiGain: GainNode | null = null;

  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private currentMusic: AudioBufferSourceNode | null = null;
  private currentMusicTrack: MusicTrack | null = null;

  private preferences: AudioPreferences = { ...DEFAULT_PREFERENCES };
  private isInitialized = false;
  private loadingPromises: Map<string, Promise<AudioBuffer>> = new Map();

  // Sound definitions - paths to audio files
  private musicDefinitions: Record<MusicTrack, SoundDefinition> = {
    menu: { url: '/sounds/music/menu.mp3', loop: true, volume: 0.6 },
    gameplay: { url: '/sounds/music/gameplay.mp3', loop: true, volume: 0.5 },
    victory: { url: '/sounds/music/victory.mp3', loop: false, volume: 0.7 },
    defeat: { url: '/sounds/music/defeat.mp3', loop: false, volume: 0.7 },
  };

  private sfxDefinitions: Record<SfxType, SoundDefinition> = {
    fire_standard: { url: '/sounds/sfx/fire_standard.mp3', volume: 0.7 },
    fire_heavy: { url: '/sounds/sfx/fire_heavy.mp3', volume: 0.8 },
    fire_precision: { url: '/sounds/sfx/fire_precision.mp3', volume: 0.6 },
    fire_cluster: { url: '/sounds/sfx/fire_cluster.mp3', volume: 0.7 },
    fire_napalm: { url: '/sounds/sfx/fire_napalm.mp3', volume: 0.7 },
    fire_emp: { url: '/sounds/sfx/fire_emp.mp3', volume: 0.6 },
    fire_bouncing: { url: '/sounds/sfx/fire_bouncing.mp3', volume: 0.7 },
    fire_bunker: { url: '/sounds/sfx/fire_bunker.mp3', volume: 0.8 },
    fire_homing: { url: '/sounds/sfx/fire_homing.mp3', volume: 0.7 },
    explosion_small: { url: '/sounds/sfx/explosion_small.mp3', volume: 0.6 },
    explosion_medium: { url: '/sounds/sfx/explosion_medium.mp3', volume: 0.7 },
    explosion_large: { url: '/sounds/sfx/explosion_large.mp3', volume: 0.9 },
    explosion_fire: { url: '/sounds/sfx/explosion_fire.mp3', volume: 0.7 },
    explosion_electric: { url: '/sounds/sfx/explosion_electric.mp3', volume: 0.6 },
    tank_destruction: { url: '/sounds/sfx/tank_destruction.mp3', volume: 0.9 },
    tank_hit: { url: '/sounds/sfx/tank_hit.mp3', volume: 0.5 },
    money_earned: { url: '/sounds/sfx/money_earned.mp3', volume: 0.5 },
  };

  private uiDefinitions: Record<UiSoundType, SoundDefinition> = {
    hover: { url: '/sounds/ui/hover.mp3', volume: 0.3 },
    click: { url: '/sounds/ui/click.mp3', volume: 0.5 },
    purchase: { url: '/sounds/ui/purchase.mp3', volume: 0.6 },
    error: { url: '/sounds/ui/error.mp3', volume: 0.5 },
    turn_change: { url: '/sounds/ui/turn_change.mp3', volume: 0.4 },
  };

  constructor() {
    this.loadPreferences();
  }

  /**
   * Initialize the audio context.
   * Must be called after user interaction (browser autoplay policy).
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Create gain nodes for volume control
      this.masterGain = this.audioContext.createGain();
      this.musicGain = this.audioContext.createGain();
      this.sfxGain = this.audioContext.createGain();
      this.uiGain = this.audioContext.createGain();

      // Connect gain nodes: category -> master -> destination
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.uiGain.connect(this.masterGain);
      this.masterGain.connect(this.audioContext.destination);

      // Apply saved preferences
      this.applyPreferences();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  /**
   * Resume audio context if suspended (browser autoplay policy).
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Load audio preferences from localStorage.
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(AUDIO_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AudioPreferences>;
        this.preferences = { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load audio preferences:', error);
    }
  }

  /**
   * Save audio preferences to localStorage.
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(AUDIO_PREFS_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save audio preferences:', error);
    }
  }

  /**
   * Apply current preferences to gain nodes.
   */
  private applyPreferences(): void {
    if (!this.masterGain || !this.musicGain || !this.sfxGain || !this.uiGain) return;

    const masterVol = this.preferences.muted ? 0 : this.preferences.masterVolume;
    this.masterGain.gain.value = masterVol;
    this.musicGain.gain.value = this.preferences.musicVolume;
    this.sfxGain.gain.value = this.preferences.sfxVolume;
    this.uiGain.gain.value = this.preferences.uiVolume;
  }

  /**
   * Load a sound file into an AudioBuffer.
   */
  private async loadSound(url: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;

    // Check if already loaded
    if (this.soundBuffers.has(url)) {
      return this.soundBuffers.get(url)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading
    const loadPromise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
        this.soundBuffers.set(url, audioBuffer);
        return audioBuffer;
      } catch (error) {
        console.warn(`Failed to load sound: ${url}`, error);
        throw error;
      } finally {
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Preload sounds for a category.
   */
  async preloadCategory(category: 'music' | 'sfx' | 'ui'): Promise<void> {
    let definitions: Record<string, SoundDefinition>;

    switch (category) {
      case 'music':
        definitions = this.musicDefinitions;
        break;
      case 'sfx':
        definitions = this.sfxDefinitions;
        break;
      case 'ui':
        definitions = this.uiDefinitions;
        break;
    }

    const urls = Object.values(definitions).map(d => d.url);
    await Promise.allSettled(urls.map(url => this.loadSound(url)));
  }

  /**
   * Preload all sounds.
   */
  async preloadAll(): Promise<void> {
    await Promise.all([
      this.preloadCategory('music'),
      this.preloadCategory('sfx'),
      this.preloadCategory('ui'),
    ]);
  }

  /**
   * Play a one-shot sound.
   */
  private async playOneShot(
    url: string,
    gainNode: GainNode | null,
    baseVolume = 1,
    loop = false
  ): Promise<AudioBufferSourceNode | null> {
    if (!this.audioContext || !gainNode) return null;

    await this.resume();

    try {
      const buffer = await this.loadSound(url);
      if (!buffer) return null;

      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;

      // Create a gain node for this specific sound
      const soundGain = this.audioContext.createGain();
      soundGain.gain.value = baseVolume;

      source.connect(soundGain);
      soundGain.connect(gainNode);

      source.start(0);
      return source;
    } catch {
      // Sound failed to load - fail silently
      return null;
    }
  }

  // ============================================================================
  // MUSIC CONTROLS
  // ============================================================================

  /**
   * Play background music.
   */
  async playMusic(track: MusicTrack): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    // Don't restart if same track is playing
    if (this.currentMusicTrack === track && this.currentMusic) return;

    // Stop current music
    this.stopMusic();

    const definition = this.musicDefinitions[track];
    const source = await this.playOneShot(
      definition.url,
      this.musicGain,
      definition.volume ?? 1,
      definition.loop ?? false
    );

    if (source) {
      this.currentMusic = source;
      this.currentMusicTrack = track;

      // Handle non-looping tracks ending
      if (!definition.loop) {
        source.onended = () => {
          if (this.currentMusic === source) {
            this.currentMusic = null;
            this.currentMusicTrack = null;
          }
        };
      }
    }
  }

  /**
   * Stop background music.
   */
  stopMusic(): void {
    if (this.currentMusic) {
      try {
        this.currentMusic.stop();
      } catch {
        // Already stopped
      }
      this.currentMusic = null;
      this.currentMusicTrack = null;
    }
  }

  /**
   * Crossfade to a new music track.
   */
  async crossfadeMusic(track: MusicTrack, duration = 1000): Promise<void> {
    if (!this.isInitialized || !this.audioContext || !this.musicGain) {
      await this.playMusic(track);
      return;
    }

    // Don't crossfade if same track
    if (this.currentMusicTrack === track) return;

    const oldVolume = this.musicGain.gain.value;

    // Fade out current music
    this.musicGain.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + duration / 1000
    );

    // Wait for fade out
    await new Promise(resolve => setTimeout(resolve, duration));

    // Stop old music and start new
    this.stopMusic();
    this.musicGain.gain.value = 0;

    // Start new track
    await this.playMusic(track);

    // Fade in new music
    if (this.musicGain && this.audioContext) {
      this.musicGain.gain.linearRampToValueAtTime(
        oldVolume,
        this.audioContext.currentTime + duration / 1000
      );
    }
  }

  /**
   * Get current music track.
   */
  getCurrentMusicTrack(): MusicTrack | null {
    return this.currentMusicTrack;
  }

  // ============================================================================
  // SOUND EFFECTS
  // ============================================================================

  /**
   * Play a sound effect.
   */
  async playSfx(sfx: SfxType): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const definition = this.sfxDefinitions[sfx];
    await this.playOneShot(definition.url, this.sfxGain, definition.volume ?? 1);
  }

  /**
   * Play weapon firing sound.
   */
  async playWeaponFire(weaponType: WeaponType): Promise<void> {
    const sfx = getFireSoundForWeapon(weaponType);
    await this.playSfx(sfx);
  }

  /**
   * Play explosion sound.
   */
  async playExplosion(blastRadius: number, weaponType?: WeaponType): Promise<void> {
    const isFireType = weaponType === 'napalm';
    const isElectricType = weaponType === 'emp';
    const sfx = getExplosionSound(blastRadius, isFireType, isElectricType);
    await this.playSfx(sfx);
  }

  /**
   * Play tank destruction sound.
   */
  async playTankDestruction(): Promise<void> {
    await this.playSfx('tank_destruction');
  }

  /**
   * Play tank hit sound.
   */
  async playTankHit(): Promise<void> {
    await this.playSfx('tank_hit');
  }

  /**
   * Play money earned sound.
   */
  async playMoneyEarned(): Promise<void> {
    await this.playSfx('money_earned');
  }

  // ============================================================================
  // UI SOUNDS
  // ============================================================================

  /**
   * Play a UI sound.
   */
  async playUi(sound: UiSoundType): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const definition = this.uiDefinitions[sound];
    await this.playOneShot(definition.url, this.uiGain, definition.volume ?? 1);
  }

  /**
   * Play hover sound.
   */
  async playHover(): Promise<void> {
    await this.playUi('hover');
  }

  /**
   * Play click sound.
   */
  async playClick(): Promise<void> {
    await this.playUi('click');
  }

  /**
   * Play purchase sound.
   */
  async playPurchase(): Promise<void> {
    await this.playUi('purchase');
  }

  /**
   * Play error sound.
   */
  async playError(): Promise<void> {
    await this.playUi('error');
  }

  // ============================================================================
  // VOLUME CONTROLS
  // ============================================================================

  /**
   * Set master volume (0-1).
   */
  setMasterVolume(volume: number): void {
    this.preferences.masterVolume = Math.max(0, Math.min(1, volume));
    this.applyPreferences();
    this.savePreferences();
  }

  /**
   * Set music volume (0-1).
   */
  setMusicVolume(volume: number): void {
    this.preferences.musicVolume = Math.max(0, Math.min(1, volume));
    this.applyPreferences();
    this.savePreferences();
  }

  /**
   * Set sound effects volume (0-1).
   */
  setSfxVolume(volume: number): void {
    this.preferences.sfxVolume = Math.max(0, Math.min(1, volume));
    this.applyPreferences();
    this.savePreferences();
  }

  /**
   * Set UI sounds volume (0-1).
   */
  setUiVolume(volume: number): void {
    this.preferences.uiVolume = Math.max(0, Math.min(1, volume));
    this.applyPreferences();
    this.savePreferences();
  }

  /**
   * Toggle mute state.
   */
  toggleMute(): boolean {
    this.preferences.muted = !this.preferences.muted;
    this.applyPreferences();
    this.savePreferences();
    return this.preferences.muted;
  }

  /**
   * Set mute state.
   */
  setMuted(muted: boolean): void {
    this.preferences.muted = muted;
    this.applyPreferences();
    this.savePreferences();
  }

  /**
   * Get current preferences.
   */
  getPreferences(): AudioPreferences {
    return { ...this.preferences };
  }

  /**
   * Check if audio is initialized.
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if muted.
   */
  isMuted(): boolean {
    return this.preferences.muted;
  }
}

// Export singleton instance
export const audioManager = new AudioManager();

// Export class for testing
export { AudioManager };
