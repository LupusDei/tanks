import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  AudioControls,
  ControlPanel,
  GameConfigScreen,
  GameContainer,
  GameOverScreen,
  LoadingScreen,
  PlayerNameEntry,
  TurnIndicator,
  WeaponSelectionPanel,
  WeaponShop,
  CampaignLeaderboard,
} from './components'
import { useIsMobile } from './hooks'
import { useGame } from './context/useGame'
import { useUser } from './context/UserContext'
import { useCampaign } from './context/CampaignContext'
import { useAudio } from './context/AudioContext'
import {
  initializeGame,
  applyArmorToTanks,
  renderTank,
  createProjectileState,
  renderProjectile,
  calculateAIShot,
  selectTargetWithPersistence,
  selectAIWeapon,
  getChevronCount,
  getStarCount,
  getNextDifficulty,
  resetAIState,
  recordShot,
  getConsecutiveShots,
  renderExplosion,
  getWeaponConfig,
  createTankDestruction,
  renderTankDestruction,
  renderClusterSubProjectiles,
  createCrater,
  generateInitialWind,
  generateNextWind,
  calculateKillReward,
  createMoneyAnimation,
  renderMoneyAnimation,
  renderWindParticles,
  calculateMovementTarget,
  getAnimatedPosition,
  getFinalPosition,
  GAS_CAN_FUEL_VALUE,
  MOVEMENT_FUEL_PER_INCREMENT,
  type ProjectileState,
  type ExplosionState,
  type WeaponType,
  type TankDestructionState,
  type MoneyAnimationState,
  type WindParticleSystemState,
} from './engine'
import { TankColor, TerrainSize, TERRAIN_SIZES, EnemyCount, AIDifficulty, CampaignLength } from './types/game'
import {
  getWeaponInventory,
  getArmorInventory,
  loadActiveCampaign,
  getGasCanCount,
  getCampaignGasCanCount,
  clearConsumableInventory,
  clearAllCampaignConsumables,
} from './services/userDatabase'
import { decideAIPurchases, selectAIWeaponFromInventory, calculateAIGameEarnings } from './engine/ai'
import { useGameTick } from './hooks/useGameTick'
import type { SimEvent, SimulationState, TickContext } from './engine/simulation'

interface GameConfig {
  terrainSize: TerrainSize
  enemyCount: EnemyCount
  playerColor: TankColor
  aiDifficulty: AIDifficulty
}

// Tank dimensions for hit detection (must match tank.ts)
const TANK_BODY_WIDTH = 40
const TANK_BODY_HEIGHT = 20
const TANK_WHEEL_RADIUS = 6

function App() {
  const { state, actions } = useGame()
  const { userData, createNewUser, recordGame, consumeWeapon, clearArmor } = useUser()
  const {
    campaign,
    isCampaignMode,
    getPlayer,
    getAIParticipants,
    startNewCampaign,
    resumeCampaign,
    abandonCampaign,
    recordKill,
    recordDeath,
    recordGameEnd,
    advanceToNextGame,
    updateBalance,
    purchaseWeapon: campaignPurchaseWeapon,
    useWeapon: campaignUseWeapon,
    isCampaignComplete,
    getCurrentGame,
    getTotalGames,
    clearAllArmor,
  } = useCampaign()
  const { playMusic, crossfadeMusic, playWeaponFire, playExplosion, playTankDestruction } = useAudio()

  // Array of active projectiles for simultaneous firing
  const projectilesRef = useRef<ProjectileState[]>([])
  // Array of active explosions for simultaneous impacts
  const explosionsRef = useRef<ExplosionState[]>([])
  // Array of active tank destruction animations
  const destructionsRef = useRef<TankDestructionState[]>([])
  // Array of active money earned animations
  const moneyAnimationsRef = useRef<MoneyAnimationState[]>([])
  // Wind particle system state
  const windParticlesRef = useRef<WindParticleSystemState | null>(null)
  // Current frame's shared context (timestamp + canvas size), set at the top of
  // each render frame so the event-drain handler can build animations/craters
  // with the same time/dimensions the simulation step used.
  const frameCtxRef = useRef<{ now: number; canvasWidth: number; canvasHeight: number }>({
    now: performance.now(),
    canvasWidth: 800,
    canvasHeight: 600,
  })
  const [isProjectileActive, setIsProjectileActive] = useState(false)
  const [isExplosionActive, setIsExplosionActive] = useState(false)
  const [isFittedToScreen, setIsFittedToScreen] = useState(false)
  const gameRecordedRef = useRef(false)
  const isMobile = useIsMobile()

  // Track viewport dimensions for mobile scaling
  const [viewportSize, setViewportSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  }))

  // Update viewport size on resize/orientation change
  useEffect(() => {
    const updateViewport = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)
    // Also update after a short delay to handle mobile browser chrome changes
    const timeoutId = setTimeout(updateViewport, 100)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
      clearTimeout(timeoutId)
    }
  }, [])

  // Track kills during the current game for campaign earnings
  const gameKillsRef = useRef<Map<string, number>>(new Map())


  // Record game stats when game ends
  useEffect(() => {
    if (state.phase === 'gameover' && state.winner && !gameRecordedRef.current) {
      gameRecordedRef.current = true

      if (isCampaignMode) {
        // Campaign mode: record win and transition to leaderboard
        recordGameEnd(state.winner)

        // Calculate and apply campaign earnings for all participants
        const gameKills = gameKillsRef.current
        for (const [tankId, killCount] of gameKills.entries()) {
          const isWinner = tankId === state.winner
          const participant = campaign?.participants.find(p => p.id === tankId)
          if (participant) {
            const earnings = calculateAIGameEarnings(isWinner, killCount, participant.currentLevel)
            if (earnings > 0) {
              updateBalance(tankId, earnings)
            }
          }
        }

        // Clear armor for all campaign participants (armor is consumed after each game)
        clearAllArmor()

        // Transition to campaign leaderboard
        actions.setPhase('campaignLeaderboard')
      } else {
        // Free play mode: record stats as usual
        const isVictory = state.winner === 'player'
        const enemiesKilled = state.tanks.filter(
          (t) => t.id !== 'player' && t.health <= 0
        ).length

        recordGame({
          isVictory,
          enemyCount: state.enemyCount,
          enemiesKilled,
          terrainSize: state.terrainSize,
          aiDifficulty: state.aiDifficulty,
          turnsPlayed: state.currentTurn,
          playerColor: state.playerColor!,
        })

        // Clear armor (armor is consumed after each game)
        clearArmor()
      }
    }

    // Reset the recorded flag and kill tracker when game resets
    if (state.phase === 'loading' || state.phase === 'config' || state.phase === 'weaponShop') {
      gameRecordedRef.current = false
      gameKillsRef.current.clear()
    }
  }, [state.phase, state.winner, state.tanks, state.enemyCount, state.terrainSize, state.aiDifficulty, state.currentTurn, state.playerColor, recordGame, isCampaignMode, recordGameEnd, campaign, updateBalance, actions, clearArmor, clearAllArmor])

  // Background music based on game phase
  useEffect(() => {
    switch (state.phase) {
      case 'loading':
      case 'playerName':
      case 'config':
      case 'weaponShop':
        // Menu/config screens use menu music
        playMusic('menu')
        break
      case 'playing':
        // Gameplay uses gameplay music
        crossfadeMusic('gameplay', 1000)
        break
      case 'gameover':
      case 'campaignLeaderboard': {
        // Determine if player won
        let playerWon = false
        if (isCampaignMode) {
          const player = getPlayer()
          playerWon = state.winner === player?.id
        } else {
          playerWon = state.winner === 'player'
        }
        // Play victory or defeat music
        playMusic(playerWon ? 'victory' : 'defeat')
        break
      }
    }
  }, [state.phase, state.winner, isCampaignMode, getPlayer, playMusic, crossfadeMusic])

  // Track whether AI tanks are currently processing their shots
  const aiProcessingRef = useRef(false)
  // Store timeout IDs for each AI tank's thinking delay
  const aiTimeoutsRef = useRef<Map<string, number>>(new Map())

  // Keep refs to latest state for use in timeouts
  const stateRef = useRef(state)
  stateRef.current = state

  // Check if player has queued their shot and AI should respond
  const playerTank = state.tanks.find((t) => t.id === 'player')
  const playerIsReady = playerTank?.isReady ?? false
  const playerIsAlive = playerTank && playerTank.health > 0

  // AI should queue when:
  // 1. Player is alive and has queued their shot, OR
  // 2. Player is dead (AI-only battle mode)
  const shouldAIQueue = state.phase === 'playing' &&
    (playerIsReady || !playerIsAlive) &&
    !isProjectileActive &&
    !isExplosionActive

  // Reset AI processing flag when player is no longer ready
  useEffect(() => {
    if (!shouldAIQueue) {
      aiProcessingRef.current = false
    }
  }, [shouldAIQueue])

  // Auto-skip player's turn when stunned
  useEffect(() => {
    if (state.phase !== 'playing' || isProjectileActive || isExplosionActive) return

    const player = state.tanks.find((t) => t.id === 'player')
    if (!player || player.health <= 0 || player.isReady) return

    // If player is stunned, auto-skip their turn
    if (player.stunTurnsRemaining > 0) {
      actions.updateTank('player', {
        queuedShot: null,
        isReady: true,
        stunTurnsRemaining: player.stunTurnsRemaining - 1,
      })
    }
  }, [state.phase, state.tanks, isProjectileActive, isExplosionActive, actions])

  // AI queueing effect - triggers when player queues their shot or player is dead
  useEffect(() => {
    // Only process when conditions met and we haven't started processing
    if (!shouldAIQueue || aiProcessingRef.current) {
      return
    }

    // Use refs to get current state to avoid re-running effect when tank state changes
    const currentState = stateRef.current
    const aliveTanks = currentState.tanks.filter((t) => t.health > 0)
    const aiTanks = currentState.tanks.filter((t) => t.id !== 'player' && t.health > 0 && !t.isReady && t.stunTurnsRemaining === 0)
    const stunnedAITanks = currentState.tanks.filter((t) => t.id !== 'player' && t.health > 0 && !t.isReady && t.stunTurnsRemaining > 0)

    // Need at least 2 alive tanks for combat to continue
    // Also need either non-stunned AI tanks OR stunned AI tanks to process
    if (aliveTanks.length < 2 || (aiTanks.length === 0 && stunnedAITanks.length === 0)) {
      return
    }

    // Mark as processing to prevent re-entry
    aiProcessingRef.current = true

    // Mark stunned AI tanks as ready immediately (they skip their turn but don't hold up the round)
    // Also decrement their stun counter since they're "consuming" their stun turn
    for (const stunnedTank of stunnedAITanks) {
      actions.updateTank(stunnedTank.id, {
        queuedShot: null,
        isReady: true,
        stunTurnsRemaining: stunnedTank.stunTurnsRemaining - 1,
      })
    }

    // Calculate and queue shots for all non-stunned AI tanks simultaneously
    for (const aiTank of aiTanks) {
      // Select target with persistence (sticks with same target unless dead or better opportunity)
      const target = selectTargetWithPersistence(aiTank, aliveTanks)
      if (!target) continue

      // Get consecutive shots for bracketing/zeroing
      const consecutiveShots = getConsecutiveShots(aiTank.id, target.id)

      // Calculate AI shot targeting the selected tank with bracketing
      const aiDecision = calculateAIShot(
        aiTank,
        target,
        currentState.terrain,
        currentState.aiDifficulty,
        { consecutiveShots, wind: currentState.wind }
      )

      // Record this shot for bracketing system
      recordShot(aiTank.id, target.id)

      // Update AI tank's angle and power immediately (rounded to integers)
      actions.updateTank(aiTank.id, {
        angle: Math.round(aiDecision.angle),
        power: Math.round(aiDecision.power),
      })

      // Queue the shot after thinking delay
      const tankId = aiTank.id
      const timeoutId = window.setTimeout(() => {
        // Get the latest tank state
        const tank = stateRef.current.tanks.find((t) => t.id === tankId)
        if (tank && !tank.isReady) {
          actions.updateTank(tankId, {
            queuedShot: { angle: tank.angle, power: tank.power },
            isReady: true,
          })
        }
        aiTimeoutsRef.current.delete(tankId)
      }, aiDecision.thinkingTimeMs)

      aiTimeoutsRef.current.set(tankId, timeoutId)
    }

    // Copy ref value for cleanup (React best practice)
    const timeoutsMap = aiTimeoutsRef.current

    // Cleanup timeouts on unmount
    return () => {
      for (const timeoutId of timeoutsMap.values()) {
        window.clearTimeout(timeoutId)
      }
      timeoutsMap.clear()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAIQueue])

  // Check if all alive tanks are ready to fire
  const aliveTanks = state.tanks.filter((t) => t.health > 0)
  const allTanksReady = state.phase === 'playing' &&
    aliveTanks.length > 0 &&
    aliveTanks.every((t) => t.isReady) &&
    !isProjectileActive &&
    !isExplosionActive

  // Launch all projectiles when all tanks are ready
  useEffect(() => {
    if (!allTanksReady) return

    const currentState = stateRef.current
    const readyTanks = currentState.tanks.filter((t) => t.health > 0 && t.isReady && t.queuedShot)

    if (readyTanks.length === 0) return

    // Get canvas dimensions from current terrain size
    const terrainConfig = TERRAIN_SIZES[currentState.terrainSize]
    const canvasHeight = terrainConfig.height
    const canvasWidth = terrainConfig.width
    const launchTime = performance.now()

    // Get player tank to determine AI targets
    const playerTankForAI = currentState.tanks.find((t) => t.id === 'player')

    // Create projectiles for all ready tanks simultaneously
    const newProjectiles: ProjectileState[] = []
    for (const tank of readyTanks) {
      // Use queued shot values for the projectile
      const tankWithQueuedValues = {
        ...tank,
        angle: tank.queuedShot!.angle,
        power: tank.queuedShot!.power,
      }

      // Determine weapon type for this tank
      let weaponType: WeaponType = 'standard'
      if (tank.id === 'player') {
        // Player uses their selected weapon
        weaponType = currentState.selectedWeapon
      } else if (playerTankForAI) {
        // AI selects weapon based on difficulty and target
        if (isCampaignMode && campaign) {
          // Campaign mode: use campaign inventory
          const aiParticipant = campaign.participants.find(p => p.id === tank.id)
          if (aiParticipant) {
            weaponType = selectAIWeaponFromInventory(
              aiParticipant.currentLevel,
              tank,
              playerTankForAI,
              aiParticipant.weaponInventory
            )
            // Consume the weapon from campaign inventory
            if (weaponType !== 'standard') {
              campaignUseWeapon(tank.id, weaponType)
            }
          }
        } else {
          // Free play mode: AI has infinite basic weapons
          weaponType = selectAIWeapon(currentState.aiDifficulty, tank, playerTankForAI)
        }
      }

      const projectile = createProjectileState(tankWithQueuedValues, launchTime, canvasHeight, canvasWidth, weaponType)
      newProjectiles.push(projectile)

      // Play weapon fire sound
      playWeaponFire(weaponType)

      // Decrement ammo when player fires a non-standard weapon
      if (tank.id === 'player' && weaponType !== 'standard') {
        const currentAmmo = currentState.weaponAmmo[weaponType] ?? 0
        console.log('[App] Firing weapon:', weaponType, 'currentAmmo:', currentAmmo)
        actions.decrementAmmo(weaponType)

        // Consume from appropriate inventory
        if (isCampaignMode) {
          // Campaign mode: consume from campaign inventory
          const player = getPlayer()
          if (player) {
            const consumed = campaignUseWeapon(player.id, weaponType)
            console.log('[App] campaignUseWeapon returned:', consumed)
          }
        } else {
          // Free play mode: consume from user inventory
          const consumed = consumeWeapon(weaponType)
          console.log('[App] consumeWeapon returned:', consumed)
        }

        // Auto-switch to standard when weapon is depleted
        if (currentAmmo <= 1) {
          actions.setSelectedWeapon('standard')
        }
      }
    }

    // Add all projectiles at once
    projectilesRef.current = [...projectilesRef.current, ...newProjectiles]
    setIsProjectileActive(true)

    // Reset all tanks' queued state
    for (const tank of readyTanks) {
      actions.updateTank(tank.id, {
        queuedShot: null,
        isReady: false,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTanksReady])

  const handleFreePlay = () => {
    // Skip name entry if user already exists (only show on browser refresh)
    if (userData) {
      actions.setPhase('config')
    } else {
      actions.setPhase('playerName')
    }
  }

  const handleNewCampaign = (length: CampaignLength) => {
    // Start a new campaign - need to get player name first if not exists
    if (userData) {
      // Go to config screen to set up campaign parameters
      actions.setPhase('config')
    } else {
      actions.setPhase('playerName')
    }
    // Store the campaign length to use after config is complete
    // We'll create the campaign when config is complete
    pendingCampaignLengthRef.current = length
  }

  const handleResumeCampaign = () => {
    // Resume existing campaign - go directly to weapon shop
    if (resumeCampaign()) {
      // Campaign resumed, skip config and go to weapon shop
      if (campaign) {
        // Apply campaign config to game state
        actions.setTerrainSize(campaign.config.terrainSize)
        actions.setEnemyCount(campaign.config.enemyCount)
        actions.setPlayerColor(campaign.config.playerColor)
        actions.setAIDifficulty(campaign.config.aiDifficulty)
      }
      actions.setPhase('weaponShop')
    }
  }

  // Track pending campaign length for when config is complete
  const pendingCampaignLengthRef = useRef<CampaignLength | null>(null)

  const handlePlayerNameSubmit = (name: string) => {
    // Create or update user with the entered name
    if (!userData) {
      createNewUser(name)
    } else if (userData.profile.username !== name) {
      // If the name is different, create a new user (name-based identity)
      createNewUser(name)
    }
    actions.setPhase('config')
  }

  const handleConfigComplete = (config: GameConfig) => {
    // Reset AI state for new game (target persistence and shot history)
    resetAIState()

    // Check if this is a new campaign
    const pendingLength = pendingCampaignLengthRef.current
    if (pendingLength && userData) {
      // Create the campaign with selected config
      const campaignConfig = {
        terrainSize: config.terrainSize,
        enemyCount: config.enemyCount,
        playerColor: config.playerColor,
        aiDifficulty: config.aiDifficulty,
      }
      startNewCampaign(pendingLength, campaignConfig, userData.profile.username)
      pendingCampaignLengthRef.current = null
    }

    // Get terrain dimensions from selected size
    const terrainConfig = TERRAIN_SIZES[config.terrainSize]

    // Initialize game with terrain and tanks
    const { terrain, tanks } = initializeGame({
      canvasWidth: terrainConfig.width,
      canvasHeight: terrainConfig.height,
      playerColor: config.playerColor,
      enemyCount: config.enemyCount,
    })

    // Store configuration choices
    actions.setTerrainSize(config.terrainSize)
    actions.setEnemyCount(config.enemyCount)
    actions.setPlayerColor(config.playerColor)
    actions.setAIDifficulty(config.aiDifficulty)

    // Set terrain and tanks in game state
    actions.setTerrain(terrain)
    actions.initializeTanks(tanks)

    // Transition to weapon shop phase
    actions.setPhase('weaponShop')
  }

  const handleWeaponConfirm = (weapon: WeaponType) => {
    if (isCampaignMode) {
      // Campaign mode: read fresh from localStorage (context state may not have updated yet)
      const freshCampaign = loadActiveCampaign()
      const player = freshCampaign?.participants.find(p => p.isPlayer)
      const campaignInventory = player?.weaponInventory ?? { standard: Infinity }
      console.log('[handleWeaponConfirm] campaign inventory from localStorage:', campaignInventory)
      actions.setWeaponAmmo({
        ...campaignInventory,
        standard: Infinity,
      })

      // AI shopping phase - each AI buys weapons
      performAIShopping()

      // Initialize game with campaign participants (includes armor application)
      initializeCampaignGame()
    } else {
      // Free play mode: use user inventory
      const freshInventory = getWeaponInventory() ?? { standard: Infinity }
      console.log('[handleWeaponConfirm] free play inventory from localStorage:', freshInventory)
      actions.setWeaponAmmo({
        ...freshInventory,
        standard: Infinity,
      })

      // Apply armor to player tank (only player has armor in free play)
      const playerArmor = getArmorInventory()
      let updatedTanks = state.tanks
      if (Object.keys(playerArmor).length > 0) {
        const armorMap = new Map([['player', playerArmor]])
        updatedTanks = applyArmorToTanks(state.tanks, armorMap)
      }

      // Apply fuel from gas cans to player tank
      const gasCanCount = getGasCanCount()
      const playerFuel = gasCanCount * GAS_CAN_FUEL_VALUE
      if (playerFuel > 0) {
        updatedTanks = updatedTanks.map(tank =>
          tank.id === 'player' ? { ...tank, fuel: playerFuel } : tank
        )
      }

      // Update tanks if armor or fuel was applied
      if (Object.keys(playerArmor).length > 0 || playerFuel > 0) {
        actions.initializeTanks(updatedTanks)
      }

      // Clear consumables after applying them (they're single-use per game)
      clearConsumableInventory()
    }

    actions.setSelectedWeapon(weapon)
    // Generate initial wind for the game
    actions.setWind(generateInitialWind())
    actions.setPhase('playing')
  }

  // Perform AI shopping for campaign mode
  const performAIShopping = () => {
    const aiParticipants = getAIParticipants()
    for (const aiParticipant of aiParticipants) {
      const purchases = decideAIPurchases(
        aiParticipant.currentLevel,
        aiParticipant.balance,
        aiParticipant.weaponInventory
      )
      for (const purchase of purchases) {
        campaignPurchaseWeapon(aiParticipant.id, purchase.weaponType)
      }
    }
  }

  // Initialize game with campaign participant inventories
  const initializeCampaignGame = () => {
    // Re-read campaign from localStorage for fresh data
    const freshCampaign = loadActiveCampaign()
    if (!freshCampaign) return

    // Reset AI state for new game
    resetAIState()

    // Get terrain dimensions from campaign config
    const terrainConfig = TERRAIN_SIZES[freshCampaign.config.terrainSize]

    // Initialize game with terrain and tanks
    const { terrain, tanks } = initializeGame({
      canvasWidth: terrainConfig.width,
      canvasHeight: terrainConfig.height,
      playerColor: freshCampaign.config.playerColor,
      enemyCount: freshCampaign.config.enemyCount,
    })

    // Build armor map from campaign participants
    // Map tank IDs to their armor inventories
    const armorMap = new Map<string, typeof freshCampaign.participants[0]['armorInventory']>()

    // Player tank ID is 'player', AI tank IDs are 'enemy-1', 'enemy-2', etc.
    const player = freshCampaign.participants.find(p => p.isPlayer)
    if (player) {
      armorMap.set('player', player.armorInventory ?? {})
    }

    // AI participants - match by index (enemy-1, enemy-2, etc.)
    const aiParticipants = freshCampaign.participants.filter(p => !p.isPlayer)
    aiParticipants.forEach((ai, index) => {
      armorMap.set(`enemy-${index + 1}`, ai.armorInventory ?? {})
    })

    // Apply armor to all tanks
    let updatedTanks = applyArmorToTanks(tanks, armorMap)

    // Apply fuel from gas cans to player tank (campaign mode)
    if (player) {
      const gasCanCount = getCampaignGasCanCount(player.id)
      const playerFuel = gasCanCount * GAS_CAN_FUEL_VALUE
      if (playerFuel > 0) {
        updatedTanks = updatedTanks.map(tank =>
          tank.id === 'player' ? { ...tank, fuel: playerFuel } : tank
        )
      }
    }

    // Clear all campaign consumables after applying them
    clearAllCampaignConsumables()

    // Set terrain and tanks in game state
    actions.setTerrain(terrain)
    actions.initializeTanks(updatedTanks)
  }

  const handlePlayAgain = () => {
    if (isCampaignMode) {
      // Campaign mode: abandon and go to loading screen
      abandonCampaign()
      actions.resetGame()
    } else {
      // Free play mode: go directly to config screen
      actions.resetToConfig()
    }
  }

  // Handle continuing from campaign leaderboard
  const handleCampaignContinue = () => {
    if (isCampaignComplete()) {
      // Campaign is finished - abandon and go to loading screen
      abandonCampaign()
      actions.resetGame()
    } else {
      // Advance to next game
      advanceToNextGame()

      // Reset game state but keep campaign config, go to weapon shop
      actions.resetToCampaignWeaponShop()
    }
  }

  // In simultaneous mode, player always controls their own tank
  const handleAngleChange = (newAngle: number) => {
    const playerTankForControl = state.tanks.find((t) => t.id === 'player')
    if (playerTankForControl) {
      actions.updateTank('player', { angle: newAngle })
    }
  }

  const handlePowerChange = (newPower: number) => {
    const playerTankForControl = state.tanks.find((t) => t.id === 'player')
    if (playerTankForControl) {
      actions.updateTank('player', { power: newPower })
    }
  }

  const handleFire = () => {
    const playerTankForFire = state.tanks.find((t) => t.id === 'player')
    // Allow firing during projectile/explosion phases to queue next shot
    // Only block if already queued (isReady) or player doesn't exist
    if (!playerTankForFire || playerTankForFire.isReady) return

    // Prevent firing if player is stunned
    if (playerTankForFire.stunTurnsRemaining > 0) {
      // Auto-mark as ready but skip the shot (stunned tanks don't fire)
      // Also decrement stun counter since player is "consuming" their stun turn
      actions.updateTank('player', {
        queuedShot: null,
        isReady: true,
        stunTurnsRemaining: playerTankForFire.stunTurnsRemaining - 1,
      })
      return
    }

    // Queue the shot instead of firing immediately
    actions.updateTank('player', {
      queuedShot: { angle: playerTankForFire.angle, power: playerTankForFire.power },
      isReady: true,
    })
  }

  // Toggle fit-to-screen mode for mobile devices
  const handleFitScreen = useCallback(() => {
    setIsFittedToScreen(prev => !prev)
  }, [])

  // Handle tank movement (uses 1 fuel increment per call for small moves)
  const handleMoveLeft = useCallback(() => {
    const playerTank = state.tanks.find((t) => t.id === 'player')
    if (!playerTank || !state.terrain) return
    if (playerTank.fuel <= 0 || playerTank.isReady || playerTank.isMoving) return

    const { targetX, fuelCost } = calculateMovementTarget(
      playerTank,
      'left',
      state.tanks,
      state.terrain,
      undefined, // no click target
      MOVEMENT_FUEL_PER_INCREMENT // limit to 1 fuel per increment
    )

    // Only move if there's actual distance to travel
    if (Math.abs(targetX - playerTank.position.x) > 1 && fuelCost > 0) {
      actions.startTankMove('player', targetX, fuelCost)
    }
  }, [state.tanks, state.terrain, actions])

  const handleMoveRight = useCallback(() => {
    const playerTank = state.tanks.find((t) => t.id === 'player')
    if (!playerTank || !state.terrain) return
    if (playerTank.fuel <= 0 || playerTank.isReady || playerTank.isMoving) return

    const { targetX, fuelCost } = calculateMovementTarget(
      playerTank,
      'right',
      state.tanks,
      state.terrain,
      undefined, // no click target
      MOVEMENT_FUEL_PER_INCREMENT // limit to 1 fuel per increment
    )

    // Only move if there's actual distance to travel
    if (Math.abs(targetX - playerTank.position.x) > 1 && fuelCost > 0) {
      actions.startTankMove('player', targetX, fuelCost)
    }
  }, [state.tanks, state.terrain, actions])

  // Handle canvas click to cycle AI difficulty when clicking on any enemy tank, or click-to-move
  const handleCanvasClick = useCallback((canvasX: number, canvasY: number) => {
    // Only allow clicking during player's turn and not during projectile/explosion animation
    if (state.phase !== 'playing' || isProjectileActive || isExplosionActive) return

    // Get canvas height from current terrain size
    const canvasHeight = TERRAIN_SIZES[state.terrainSize].height

    // Check if click is on any enemy tank
    const enemyTanks = state.tanks.filter((t) => t.id !== 'player')
    for (const enemyTank of enemyTanks) {
      // Convert world coordinates to canvas coordinates for hit detection
      const tankCanvasX = enemyTank.position.x
      const tankCanvasY = canvasHeight - enemyTank.position.y

      // Calculate tank bounding box (approximate)
      const tankLeft = tankCanvasX - TANK_BODY_WIDTH / 2
      const tankRight = tankCanvasX + TANK_BODY_WIDTH / 2
      const tankTop = tankCanvasY - TANK_BODY_HEIGHT / 2 - TANK_BODY_HEIGHT // Include dome
      const tankBottom = tankCanvasY + TANK_BODY_HEIGHT / 2 + TANK_WHEEL_RADIUS

      // Check if click is within tank bounds
      if (
        canvasX >= tankLeft &&
        canvasX <= tankRight &&
        canvasY >= tankTop &&
        canvasY <= tankBottom
      ) {
        // Cycle to next difficulty
        const nextDifficulty = getNextDifficulty(state.aiDifficulty)
        actions.setAIDifficulty(nextDifficulty)
        return // Only handle one click
      }
    }

    // Click-to-move: if click wasn't on an enemy tank, try to move player tank toward click
    const playerTank = state.tanks.find((t) => t.id === 'player')
    if (!playerTank || !state.terrain) return
    if (playerTank.fuel <= 0 || playerTank.isReady || playerTank.isMoving) return

    // Determine direction based on click position relative to player tank
    const direction = canvasX < playerTank.position.x ? 'left' : 'right'

    const { targetX, fuelCost } = calculateMovementTarget(
      playerTank,
      direction,
      state.tanks,
      state.terrain,
      canvasX, // Pass click X as target hint
      MOVEMENT_FUEL_PER_INCREMENT // limit to 1 fuel per click
    )

    // Only move if there's actual distance to travel
    if (Math.abs(targetX - playerTank.position.x) > 1 && fuelCost > 0) {
      actions.startTankMove('player', targetX, fuelCost)
    }
  }, [state.phase, state.tanks, state.terrain, state.aiDifficulty, state.terrainSize, isProjectileActive, isExplosionActive, actions])

  // Drain simulation events into React state / side-effects. This is the seam
  // between the pure simulation and React state: the pure step reports WHAT
  // happened (hits, craters, explosions, move-completions); this applies the
  // consequences (damage, scoring, audio, terrain deformation).
  const applyEvents = useCallback((events: SimEvent[]) => {
    const { now, canvasHeight } = frameCtxRef.current
    const currentState = stateRef.current
    const tanks = currentState.tanks

    for (const event of events) {
      switch (event.type) {
        case 'ExplosionSpawned': {
          playExplosion(event.blastRadius, event.weaponType)
          setIsExplosionActive(true)
          break
        }
        case 'CraterCreated': {
          if (currentState.terrain) {
            actions.setTerrain(createCrater(currentState.terrain, event.x, event.radius))
          }
          break
        }
        case 'TankHit': {
          const tank = tanks.find((t) => t.id === event.tankId)
          if (!tank) break
          const willKill = tank.health > 0 && tank.health - event.damage <= 0

          // Splash damage (not a direct hit); energy shield absorbs unless EMP.
          actions.damageTank(tank.id, event.damage, event.weaponType, false)

          const weaponConfig = getWeaponConfig(event.weaponType)
          if (weaponConfig.stunTurns && weaponConfig.stunTurns > 0 && !willKill) {
            actions.stunTank(tank.id, weaponConfig.stunTurns)
          }

          if (willKill) {
            const attackerId = event.sourceTankId
            const attackerTank = attackerId ? tanks.find((t) => t.id === attackerId) : undefined
            const attackerName = attackerTank?.id === 'player' ? 'Player' : `AI (${attackerTank?.color ?? 'unknown'})`
            const victimName = tank.id === 'player' ? 'Player' : `AI (${tank.color})`
            const moneyEarned = attackerId === 'player' ? calculateKillReward(currentState.aiDifficulty) : 0
            console.log(`[Kill] ${attackerName} destroyed ${victimName}${moneyEarned > 0 ? ` - Earned $${moneyEarned}` : ''}`)

            if (isCampaignMode && attackerId) {
              recordKill(attackerId)
              recordDeath(tank.id)
              const currentKills = gameKillsRef.current.get(attackerId) ?? 0
              gameKillsRef.current.set(attackerId, currentKills + 1)
            }

            if (moneyEarned > 0) {
              const moneyAnim = createMoneyAnimation(tank.position, canvasHeight, moneyEarned, now)
              moneyAnimationsRef.current = [...moneyAnimationsRef.current, moneyAnim]
            }

            const killedTank = { ...tank, killedByWeapon: event.weaponType }
            const destruction = createTankDestruction(killedTank, canvasHeight, now)
            if (destruction) {
              destructionsRef.current = [...destructionsRef.current, destruction]
              playTankDestruction()
            }
          }
          break
        }
        case 'MoveComplete': {
          if (currentState.terrain) {
            const finalPos = getFinalPosition(event.finalX, currentState.terrain)
            actions.completeTankMove(event.tankId, finalPos.x, finalPos.y)
          }
          break
        }
        case 'ProjectileResolved':
          // Activity is tracked from simulation state below; no side-effect here.
          break
      }
    }
  }, [actions, isCampaignMode, recordKill, recordDeath, playExplosion, playTankDestruction])

  const { advance: advanceSimulation } = useGameTick({ applyEvents })

  // Per-frame: advance the pure simulation, then render the resulting state.
  // All game logic lives in engine/simulation (pure, tested); this callback is
  // the thin host that feeds it React state and draws its output (no game logic).
  const handleRender = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
    const { terrain, tanks } = state
    const now = performance.now()

    // Share this frame's time + dimensions with the event-drain handler.
    frameCtxRef.current = { now, canvasWidth: ctx.canvas.width, canvasHeight: ctx.canvas.height }

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // ---- ADVANCE: step the pure simulation, drain its events ----
    if (terrain) {
      const simState: SimulationState = {
        projectiles: projectilesRef.current,
        explosions: explosionsRef.current,
        destructions: destructionsRef.current,
        moneyAnimations: moneyAnimationsRef.current,
        windParticles: windParticlesRef.current,
      }
      const tickCtx: TickContext = {
        now,
        terrain,
        tanks,
        wind: state.wind,
        canvasWidth: ctx.canvas.width,
        canvasHeight: ctx.canvas.height,
      }
      const next = advanceSimulation(simState, deltaTime, tickCtx)
      projectilesRef.current = next.projectiles
      explosionsRef.current = next.explosions
      destructionsRef.current = next.destructions
      moneyAnimationsRef.current = next.moneyAnimations
      windParticlesRef.current = next.windParticles
    }

    // ---- RENDER: draw current state (pure; no mutation, no game logic) ----
    // Wind particles (ambient background, behind terrain)
    if (windParticlesRef.current) {
      renderWindParticles(ctx, windParticlesRef.current)
    }

    // Terrain
    if (terrain) {
      ctx.fillStyle = '#8B4513'
      ctx.beginPath()
      ctx.moveTo(0, ctx.canvas.height)
      for (let x = 0; x < terrain.points.length; x++) {
        const terrainHeight = terrain.points[x]!
        const canvasY = ctx.canvas.height - terrainHeight
        ctx.lineTo(x, canvasY)
      }
      ctx.lineTo(ctx.canvas.width, ctx.canvas.height)
      ctx.closePath()
      ctx.fill()
    }

    // Tanks (skip dead and those with active destruction animations)
    const hasActiveProjectiles = projectilesRef.current.some((p) => p.isActive)
    const destroyedTankIds = new Set(
      destructionsRef.current.filter((d) => d.isActive).map((d) => d.tankId)
    )

    for (const tank of tanks) {
      if (tank.health <= 0) continue
      if (destroyedTankIds.has(tank.id)) continue

      const isCurrentTurn = tank.id === state.currentPlayerId && !hasActiveProjectiles
      const isEnemy = tank.id !== 'player'
      const chevronCount = isEnemy ? getChevronCount(state.aiDifficulty) : 0
      const starCount = isEnemy ? getStarCount(state.aiDifficulty) : 0

      let tankName: string | undefined
      if (isCampaignMode && campaign) {
        const participant = campaign.participants.find((p) => p.id === tank.id)
        tankName = participant?.name
      } else if (tank.id === 'player' && userData) {
        tankName = userData.profile.username
      }

      // Movement animation is a render concern: interpolate the drawn position.
      // Completion is detected by the simulation (MoveComplete event).
      if (
        tank.isMoving &&
        tank.moveTargetX !== null &&
        tank.moveStartTime !== null &&
        tank.moveStartX !== null &&
        terrain
      ) {
        const animResult = getAnimatedPosition(
          tank.moveStartX,
          tank.moveTargetX,
          terrain,
          tank.moveStartTime,
          now
        )
        const animatedTank = { ...tank, position: animResult.position }
        renderTank(ctx, animatedTank, ctx.canvas.height, { isCurrentTurn, chevronCount, starCount, name: tankName })
      } else {
        renderTank(ctx, tank, ctx.canvas.height, { isCurrentTurn, chevronCount, starCount, name: tankName })
      }
    }

    // Projectiles (main + cluster sub-projectiles)
    for (const projectile of projectilesRef.current) {
      if (projectile.isActive) {
        renderProjectile(ctx, projectile, now, state.wind)
      }
      if (projectile.subProjectiles && projectile.subProjectiles.length > 0) {
        renderClusterSubProjectiles(ctx, projectile, now, state.wind)
      }
    }

    // Explosions
    for (const explosion of explosionsRef.current) {
      renderExplosion(ctx, explosion, now)
    }

    // Tank destruction animations
    for (const destruction of destructionsRef.current) {
      renderTankDestruction(ctx, destruction, now)
    }

    // Money earned animations
    for (const moneyAnim of moneyAnimationsRef.current) {
      renderMoneyAnimation(ctx, moneyAnim, now)
    }

    // ---- Turn settling: when all action has resolved, advance the round ----
    const anyProjectileActive = projectilesRef.current.some(
      (p) => p.isActive || p.subProjectiles?.some((s) => s.isActive)
    )
    const anyExplosionActive = explosionsRef.current.length > 0
    const anyDestructionActive = destructionsRef.current.length > 0

    if (isProjectileActive && !anyProjectileActive) {
      setIsProjectileActive(false)
    }

    // Simultaneous mode: clear explosion state and advance the round once
    // everything has settled (no projectiles/explosions/destructions in flight).
    if (isExplosionActive && !anyExplosionActive && !anyProjectileActive && !anyDestructionActive) {
      setIsExplosionActive(false)
      actions.incrementTurn()
      // New wind for the next turn (only once all motion has stopped, to avoid
      // mid-flight wind changes when multiple tanks fire simultaneously).
      actions.setWind(generateNextWind(state.wind))
    }
  }

  if (state.phase === 'loading') {
    return (
      <LoadingScreen
        onFreePlay={handleFreePlay}
        onNewCampaign={handleNewCampaign}
        onResumeCampaign={handleResumeCampaign}
      />
    )
  }

  if (state.phase === 'playerName') {
    return <PlayerNameEntry onSubmit={handlePlayerNameSubmit} />
  }

  if (state.phase === 'config') {
    return <GameConfigScreen onStartGame={handleConfigComplete} />
  }

  if (state.phase === 'weaponShop') {
    return (
      <div className="app weapon-shop-screen">
        <WeaponShop onConfirm={handleWeaponConfirm} campaignMode={isCampaignMode} />
      </div>
    )
  }

  if (state.phase === 'gameover') {
    return <GameOverScreen winner={state.winner} onPlayAgain={handlePlayAgain} />
  }

  if (state.phase === 'campaignLeaderboard' && campaign) {
    const player = getPlayer()
    return (
      <CampaignLeaderboard
        participants={campaign.participants}
        currentGame={getCurrentGame()}
        totalGames={getTotalGames()}
        onContinue={handleCampaignContinue}
        playerId={player?.id}
      />
    )
  }

  // Get canvas dimensions from selected terrain size
  const terrainConfig = TERRAIN_SIZES[state.terrainSize]

  // Calculate fit-to-screen scale factor
  // Frame border width matches GameContainer's FRAME_BORDER_WIDTH
  const FRAME_BORDER = 60
  const gameContainerWidth = terrainConfig.width + FRAME_BORDER * 2
  const gameContainerHeight = terrainConfig.height + FRAME_BORDER * 2

  // Calculate mobile scale - terrain should fill available space after controls
  // Use tracked viewport size for responsive updates
  const { width: viewportWidth, height: viewportHeight } = viewportSize
  const isVerySmallScreen = viewportWidth < 400

  // UI element heights - be conservative to account for Safari's bottom toolbar
  // Control panel: ~70px normal, ~100px for 2-row layout on small screens
  // Weapon selection: ~60px
  // Safari bottom toolbar: ~50px extra safety margin
  const controlPanelHeight = isVerySmallScreen ? 100 : 70
  const weaponPanelHeight = 60
  const safetyMargin = 50 // For Safari's bottom toolbar and any extra chrome
  const uiHeight = controlPanelHeight + weaponPanelHeight + safetyMargin
  const availableHeight = viewportHeight - uiHeight

  // On mobile, auto-scale to fit; on desktop, only scale if fit button is pressed
  const mobileScale = Math.min(
    viewportWidth / gameContainerWidth,
    availableHeight / gameContainerHeight,
    1 // Never scale up
  )

  // Desktop fit scale (when fit button is pressed)
  const desktopFitScale = Math.min(
    viewportWidth / gameContainerWidth,
    (viewportHeight * 0.85) / gameContainerHeight,
    1
  )

  // Determine which scale to use
  const shouldAutoScale = isMobile
  const activeScale = shouldAutoScale ? mobileScale : (isFittedToScreen ? desktopFitScale : 1)

  return (
    <div
      className={`app${isFittedToScreen ? ' app--fitted' : ''}${isMobile ? ' app--mobile' : ''}`}
      style={shouldAutoScale || isFittedToScreen ? { '--fit-scale': activeScale } as React.CSSProperties : undefined}
    >
      <GameContainer
        canvasWidth={terrainConfig.width}
        canvasHeight={terrainConfig.height}
        onRender={handleRender}
        onClick={handleCanvasClick}
      />
      <AudioControls position="top-right" />
      <TurnIndicator
        turnNumber={state.currentTurn}
        playerAlive={playerIsAlive ?? false}
        isFiring={isProjectileActive || isExplosionActive}
        windSpeed={state.wind}
      />
      {playerTank && playerIsAlive && (
        <>
          <WeaponSelectionPanel
            selectedWeapon={state.selectedWeapon}
            weaponAmmo={state.weaponAmmo}
            onWeaponSelect={actions.setSelectedWeapon}
            enabled={!playerTank.isReady}
          />
          <ControlPanel
            angle={playerTank.angle}
            power={playerTank.power}
            onAngleChange={handleAngleChange}
            onPowerChange={handlePowerChange}
            onFire={handleFire}
            enabled={!playerTank.isReady}
            isQueued={playerTank.isReady}
            fuel={playerTank.fuel}
            maxFuel={playerTank.maxFuel}
            onMoveLeft={handleMoveLeft}
            onMoveRight={handleMoveRight}
            canMove={!playerTank.isReady && playerTank.fuel > 0 && !playerTank.isMoving}
            onFitScreen={handleFitScreen}
            isFittedToScreen={isFittedToScreen}
          />
        </>
      )}
    </div>
  )
}

export default App
