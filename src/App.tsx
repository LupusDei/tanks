import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  Canvas,
  ControlPanel,
  GameConfigScreen,
  GameOverScreen,
  LoadingScreen,
  PlayerNameEntry,
  TurnIndicator,
  WeaponSelectionPanel,
  WeaponShop,
} from './components'
import { useGame } from './context/useGame'
import { useUser } from './context/UserContext'
import {
  initializeGame,
  renderTank,
  createProjectileState,
  getProjectilePosition,
  renderProjectile,
  updateProjectileTrace,
  isProjectileOutOfBounds,
  getInterpolatedHeightAt,
  calculateAIShot,
  selectTarget,
  selectAIWeapon,
  getChevronCount,
  getStarCount,
  getNextDifficulty,
  createExplosion,
  updateExplosion,
  renderExplosion,
  isExplosionComplete,
  checkTankHit,
  getWeaponConfig,
  createTankDestruction,
  updateTankDestruction,
  renderTankDestruction,
  isDestructionComplete,
  updateClusterBombSplit,
  renderClusterSubProjectiles,
  type ProjectileState,
  type ExplosionState,
  type WeaponType,
  type TankDestructionState,
} from './engine'
import { TankColor, TerrainSize, TERRAIN_SIZES, EnemyCount } from './types/game'

interface GameConfig {
  terrainSize: TerrainSize
  enemyCount: EnemyCount
  playerColor: TankColor
}

// Tank dimensions for hit detection (must match tank.ts)
const TANK_BODY_WIDTH = 40
const TANK_BODY_HEIGHT = 20
const TANK_WHEEL_RADIUS = 6

function App() {
  const { state, actions } = useGame()
  const { userData, createNewUser, recordGame, weaponInventory, consumeWeapon } = useUser()
  // Array of active projectiles for simultaneous firing
  const projectilesRef = useRef<ProjectileState[]>([])
  // Array of active explosions for simultaneous impacts
  const explosionsRef = useRef<ExplosionState[]>([])
  // Array of active tank destruction animations
  const destructionsRef = useRef<TankDestructionState[]>([])
  const lastFrameTimeRef = useRef<number>(performance.now())
  const [isProjectileActive, setIsProjectileActive] = useState(false)
  const [isExplosionActive, setIsExplosionActive] = useState(false)
  const gameRecordedRef = useRef(false)


  // Record game stats when game ends
  useEffect(() => {
    if (state.phase === 'gameover' && state.winner && !gameRecordedRef.current) {
      gameRecordedRef.current = true
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
    }

    // Reset the recorded flag when game resets
    if (state.phase === 'loading') {
      gameRecordedRef.current = false
    }
  }, [state.phase, state.winner, state.tanks, state.enemyCount, state.terrainSize, state.aiDifficulty, state.currentTurn, state.playerColor, recordGame])

  // Track whether AI tanks are currently processing their shots
  const aiProcessingRef = useRef(false)
  // Store timeout IDs for each AI tank's thinking delay
  const aiTimeoutsRef = useRef<Map<string, number>>(new Map())

  // Keep refs to latest state for use in timeouts
  const stateRef = useRef(state)
  const isProjectileActiveRef = useRef(isProjectileActive)
  stateRef.current = state
  isProjectileActiveRef.current = isProjectileActive

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

  // AI queueing effect - triggers when player queues their shot or player is dead
  useEffect(() => {
    // Only process when conditions met and we haven't started processing
    if (!shouldAIQueue || aiProcessingRef.current) {
      return
    }

    // Use refs to get current state to avoid re-running effect when tank state changes
    const currentState = stateRef.current
    const aliveTanks = currentState.tanks.filter((t) => t.health > 0)
    const aiTanks = currentState.tanks.filter((t) => t.id !== 'player' && t.health > 0 && !t.isReady)

    // Need at least 2 alive tanks for combat to continue
    if (aliveTanks.length < 2 || aiTanks.length === 0) {
      return
    }

    // Mark as processing to prevent re-entry
    aiProcessingRef.current = true

    // Calculate and queue shots for all AI tanks simultaneously
    for (const aiTank of aiTanks) {
      // Select target from all alive tanks (free-for-all mode)
      const target = selectTarget(aiTank, aliveTanks)
      if (!target) continue

      // Calculate AI shot targeting the selected tank
      const aiDecision = calculateAIShot(
        aiTank,
        target,
        currentState.terrain,
        currentState.aiDifficulty
      )

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
        weaponType = selectAIWeapon(currentState.aiDifficulty, tank, playerTankForAI)
      }

      const projectile = createProjectileState(tankWithQueuedValues, launchTime, canvasHeight, canvasWidth, weaponType)
      newProjectiles.push(projectile)

      // Decrement ammo when player fires a non-standard weapon
      if (tank.id === 'player' && weaponType !== 'standard') {
        const currentAmmo = currentState.weaponAmmo[weaponType] ?? 0
        actions.decrementAmmo(weaponType)
        // Also consume from persistent inventory
        consumeWeapon(weaponType)

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

  const handleStartGame = () => {
    actions.setPhase('playerName')
  }

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

    // Set terrain and tanks in game state
    actions.setTerrain(terrain)
    actions.initializeTanks(tanks)

    // Transition to weapon shop phase
    actions.setPhase('weaponShop')
  }

  const handleWeaponConfirm = (weapon: WeaponType) => {
    // Copy user's weapon inventory to game state for this session
    // Standard always has infinite ammo
    actions.setWeaponAmmo({
      ...weaponInventory,
      standard: Infinity,
    })
    actions.setSelectedWeapon(weapon)
    actions.setPhase('playing')
  }

  const handlePlayAgain = () => {
    // Reset all game state and go back to loading screen
    actions.resetGame()
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
    if (!playerTankForFire || isProjectileActive || playerTankForFire.isReady) return

    // Queue the shot instead of firing immediately
    actions.updateTank('player', {
      queuedShot: { angle: playerTankForFire.angle, power: playerTankForFire.power },
      isReady: true,
    })
  }

  // Handle canvas click to cycle AI difficulty when clicking on any enemy tank
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
  }, [state.phase, state.tanks, state.aiDifficulty, state.terrainSize, isProjectileActive, isExplosionActive, actions])

  const handleRender = (ctx: CanvasRenderingContext2D) => {
    const { terrain, tanks } = state

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    // Render terrain if available
    if (terrain) {
      ctx.fillStyle = '#8B4513' // Brown color for terrain
      ctx.beginPath()
      ctx.moveTo(0, ctx.canvas.height)

      // Draw terrain profile
      for (let x = 0; x < terrain.points.length; x++) {
        const terrainHeight = terrain.points[x]!
        const canvasY = ctx.canvas.height - terrainHeight
        ctx.lineTo(x, canvasY)
      }

      ctx.lineTo(ctx.canvas.width, ctx.canvas.height)
      ctx.closePath()
      ctx.fill()
    }

    // Render tanks (skip dead tanks and those with active destruction animations)
    const hasActiveProjectiles = projectilesRef.current.some((p) => p.isActive)
    const destroyedTankIds = new Set(destructionsRef.current.filter(d => d.isActive).map(d => d.tankId))
    for (const tank of tanks) {
      // Skip rendering dead tanks
      if (tank.health <= 0) {
        continue
      }
      // Skip rendering tanks that have destruction animations playing
      if (destroyedTankIds.has(tank.id)) {
        continue
      }
      const isCurrentTurn = tank.id === state.currentPlayerId && !hasActiveProjectiles
      // Show rank insignia on enemy tanks to indicate AI difficulty
      const isEnemy = tank.id !== 'player'
      const chevronCount = isEnemy ? getChevronCount(state.aiDifficulty) : 0
      const starCount = isEnemy ? getStarCount(state.aiDifficulty) : 0
      renderTank(ctx, tank, ctx.canvas.height, { isCurrentTurn, chevronCount, starCount })
    }

    const currentTime = performance.now()
    const deltaTime = currentTime - lastFrameTimeRef.current
    lastFrameTimeRef.current = currentTime

    // Render and update all projectiles
    let anyProjectileActive = false
    const updatedProjectiles: ProjectileState[] = []

    // Helper function to handle projectile landing (explosion + damage + destruction animation)
    const handleProjectileLanding = (proj: ProjectileState, landingPos: { x: number; y: number }) => {
      const weaponConfig = getWeaponConfig(proj.weaponType as WeaponType)
      // For sub-projectiles, use smaller blast radius
      const blastRadius = proj.isSubProjectile ? weaponConfig.blastRadius * 0.6 : weaponConfig.blastRadius
      // For sub-projectiles, don't create sub-explosions (pass 'standard' to avoid recursive sub-explosions)
      const explosionType = proj.isSubProjectile ? 'standard' as WeaponType : proj.weaponType as WeaponType
      const newExplosion = createExplosion(landingPos, currentTime, blastRadius, explosionType)
      explosionsRef.current = [...explosionsRef.current, newExplosion]
      setIsExplosionActive(true)

      // Check for tank hits and apply weapon damage
      const damage = proj.isSubProjectile ? weaponConfig.damage * 0.6 : weaponConfig.damage
      for (const tank of tanks) {
        if (checkTankHit(landingPos, tank, ctx.canvas.height, blastRadius)) {
          // Check if this damage will kill the tank
          const willKill = tank.health > 0 && tank.health - damage <= 0

          actions.damageTank(tank.id, damage, proj.weaponType)

          // Create destruction animation if tank was killed
          if (willKill) {
            // Create a temporary tank state with the killing weapon set
            const killedTank = { ...tank, killedByWeapon: proj.weaponType }
            const destruction = createTankDestruction(killedTank, ctx.canvas.height, currentTime)
            if (destruction) {
              destructionsRef.current = [...destructionsRef.current, destruction]
            }
          }
        }
      }
    }

    for (const projectile of projectilesRef.current) {
      if (!projectile.isActive && !projectile.subProjectiles?.some(s => s.isActive)) {
        updatedProjectiles.push(projectile)
        continue
      }

      // Check for cluster bomb split (only for active main projectiles)
      let currentProjectile = projectile
      if (projectile.isActive && projectile.weaponType === 'cluster_bomb' && !projectile.hasSplit) {
        currentProjectile = updateClusterBombSplit(projectile, currentTime)

        // If split just happened, the main projectile becomes inactive
        // and sub-projectiles are created
        if (currentProjectile.hasSplit && !projectile.hasSplit) {
          // Main projectile just split - don't create explosion for main
          // Sub-projectiles will create their own explosions on landing
        }
      }

      // Handle main projectile if still active
      if (currentProjectile.isActive) {
        // Update trace points
        const updatedProjectile = updateProjectileTrace(currentProjectile, currentTime)

        // Get current position
        const position = getProjectilePosition(updatedProjectile, currentTime)

        // Check if projectile is out of bounds
        const terrainHeight = terrain ? getInterpolatedHeightAt(terrain, position.x) ?? 0 : 0
        if (isProjectileOutOfBounds(position, ctx.canvas.width, ctx.canvas.height, terrainHeight)) {
          // Projectile has landed - mark as inactive
          currentProjectile = { ...updatedProjectile, isActive: false }
          handleProjectileLanding(currentProjectile, position)
        } else {
          // Projectile still active
          currentProjectile = updatedProjectile
          anyProjectileActive = true

          // Render projectile
          renderProjectile(ctx, updatedProjectile, currentTime)
        }
      }

      // Handle sub-projectiles for cluster bomb
      if (currentProjectile.subProjectiles && currentProjectile.subProjectiles.length > 0) {
        const updatedSubProjectiles: ProjectileState[] = []

        for (const sub of currentProjectile.subProjectiles) {
          if (!sub.isActive) {
            updatedSubProjectiles.push(sub)
            continue
          }

          // Update trace points for sub-projectile
          const updatedSub = updateProjectileTrace(sub, currentTime)
          const subPosition = getProjectilePosition(updatedSub, currentTime)

          // Check if sub-projectile has landed
          const subTerrainHeight = terrain ? getInterpolatedHeightAt(terrain, subPosition.x) ?? 0 : 0
          if (isProjectileOutOfBounds(subPosition, ctx.canvas.width, ctx.canvas.height, subTerrainHeight)) {
            // Sub-projectile has landed
            updatedSubProjectiles.push({ ...updatedSub, isActive: false })
            handleProjectileLanding(updatedSub, subPosition)
          } else {
            // Sub-projectile still active
            updatedSubProjectiles.push(updatedSub)
            anyProjectileActive = true
          }
        }

        currentProjectile = { ...currentProjectile, subProjectiles: updatedSubProjectiles }

        // Render sub-projectiles
        renderClusterSubProjectiles(ctx, currentProjectile, currentTime)
      }

      updatedProjectiles.push(currentProjectile)
    }

    // Update projectiles ref with new state
    projectilesRef.current = updatedProjectiles

    // Update isProjectileActive state if needed
    if (isProjectileActive && !anyProjectileActive) {
      setIsProjectileActive(false)
    }

    // Render and update all explosions
    let anyExplosionActive = false
    const updatedExplosions: ExplosionState[] = []

    for (const explosion of explosionsRef.current) {
      if (!explosion.isActive) {
        continue // Don't keep inactive explosions
      }

      // Update explosion state
      const updatedExplosion = updateExplosion(explosion, currentTime, deltaTime)

      // Render explosion
      renderExplosion(ctx, updatedExplosion, currentTime)

      // Check if explosion is complete
      if (isExplosionComplete(updatedExplosion, currentTime)) {
        // Don't add completed explosions to the array
        continue
      } else {
        updatedExplosions.push(updatedExplosion)
        anyExplosionActive = true
      }
    }

    // Update explosions ref
    explosionsRef.current = updatedExplosions

    // Render and update all tank destruction animations
    const updatedDestructions: TankDestructionState[] = []

    for (const destruction of destructionsRef.current) {
      if (!destruction.isActive) {
        continue // Don't keep inactive destructions
      }

      // Update destruction state
      const updatedDestruction = updateTankDestruction(destruction, currentTime, deltaTime)

      // Render destruction
      renderTankDestruction(ctx, updatedDestruction, currentTime)

      // Check if destruction is complete
      if (isDestructionComplete(updatedDestruction, currentTime)) {
        // Don't add completed destructions to the array
        continue
      } else {
        updatedDestructions.push(updatedDestruction)
      }
    }

    // Update destructions ref
    destructionsRef.current = updatedDestructions

    // In simultaneous mode, just clear explosion state when all complete
    // No turn cycling - all tanks fire together each round
    if (isExplosionActive && !anyExplosionActive) {
      setIsExplosionActive(false)
      // Increment turn counter for round tracking
      actions.incrementTurn()
    }
  }

  if (state.phase === 'loading') {
    return <LoadingScreen onStart={handleStartGame} />
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
        <WeaponShop onConfirm={handleWeaponConfirm} />
      </div>
    )
  }

  if (state.phase === 'gameover') {
    return <GameOverScreen winner={state.winner} onPlayAgain={handlePlayAgain} />
  }

  // Get canvas dimensions from selected terrain size
  const terrainConfig = TERRAIN_SIZES[state.terrainSize]

  return (
    <div className="app">
      <Canvas width={terrainConfig.width} height={terrainConfig.height} onRender={handleRender} onClick={handleCanvasClick} />
      <TurnIndicator
        turnNumber={state.currentTurn}
        playerAlive={playerIsAlive ?? false}
        isFiring={isProjectileActive || isExplosionActive}
      />
      {playerTank && playerIsAlive && (
        <>
          <WeaponSelectionPanel
            selectedWeapon={state.selectedWeapon}
            weaponAmmo={state.weaponAmmo}
            onWeaponSelect={actions.setSelectedWeapon}
            enabled={!isProjectileActive && !isExplosionActive && !playerTank.isReady}
          />
          <ControlPanel
            angle={playerTank.angle}
            power={playerTank.power}
            onAngleChange={handleAngleChange}
            onPowerChange={handlePowerChange}
            onFire={handleFire}
            enabled={!isProjectileActive && !isExplosionActive && !playerTank.isReady}
            isQueued={playerTank.isReady}
          />
        </>
      )}
    </div>
  )
}

export default App
