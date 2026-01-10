import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  Canvas,
  ColorSelectionScreen,
  ControlPanel,
  EnemyCountSelector,
  GameOverScreen,
  LoadingScreen,
  TerrainSizeSelector,
  TurnIndicator,
} from './components'
import { useGame } from './context/useGame'
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
  getChevronCount,
  getStarCount,
  getNextDifficulty,
  createExplosion,
  updateExplosion,
  renderExplosion,
  isExplosionComplete,
  checkTankHit,
  type ProjectileState,
  type ExplosionState,
} from './engine'
import { TankColor, TerrainSize, TERRAIN_SIZES, EnemyCount } from './types/game'

// Tank dimensions for hit detection (must match tank.ts)
const TANK_BODY_WIDTH = 40
const TANK_BODY_HEIGHT = 20
const TANK_WHEEL_RADIUS = 6

// Damage dealt when explosion hits a tank
const EXPLOSION_DAMAGE = 25

function App() {
  const { state, actions } = useGame()
  // Array of active projectiles for simultaneous firing
  const projectilesRef = useRef<ProjectileState[]>([])
  const explosionRef = useRef<ExplosionState | null>(null)
  const lastFrameTimeRef = useRef<number>(performance.now())
  const [isProjectileActive, setIsProjectileActive] = useState(false)
  const [isExplosionActive, setIsExplosionActive] = useState(false)
  const aiTimeoutRef = useRef<number | null>(null)

  // AI turn handler - only runs when turn changes to AI (and no active projectile/explosion)
  const isAITurn = state.phase === 'playing' && state.currentPlayerId !== 'player' && !isProjectileActive && !isExplosionActive
  const aiProcessingRef = useRef(false)

  // Keep refs to latest state for use in timeouts
  const stateRef = useRef(state)
  const isProjectileActiveRef = useRef(isProjectileActive)
  stateRef.current = state
  isProjectileActiveRef.current = isProjectileActive

  // Function to fire projectile for a specific tank (uses refs for latest state)
  const fireProjectileForTank = useCallback((tankId: string) => {
    const tank = stateRef.current.tanks.find((t) => t.id === tankId)
    if (!tank) return

    // Check if this tank already has an active projectile
    const hasExistingProjectile = projectilesRef.current.some(
      (p) => p.isActive && p.tankId === tankId
    )
    if (hasExistingProjectile) return

    // Get canvas height from current terrain size
    const canvasHeight = TERRAIN_SIZES[stateRef.current.terrainSize].height

    // Add projectile to array
    const newProjectile = createProjectileState(tank, performance.now(), canvasHeight)
    projectilesRef.current = [...projectilesRef.current, newProjectile]
    setIsProjectileActive(true)
  }, [])

  // Reset AI processing flag when it's no longer AI's turn
  useEffect(() => {
    if (!isAITurn) {
      aiProcessingRef.current = false
    }
  }, [isAITurn])

  useEffect(() => {
    // Only process when it's AI's turn and not already processing
    if (!isAITurn || aiProcessingRef.current) {
      return
    }

    // Use refs to get current state to avoid re-running effect when tank state changes
    const currentState = stateRef.current
    const aiTank = currentState.tanks.find((t) => t.id === currentState.currentPlayerId)
    const playerTank = currentState.tanks.find((t) => t.id === 'player')

    if (!aiTank || !playerTank) {
      return
    }

    // Mark as processing to prevent re-entry
    aiProcessingRef.current = true

    // Calculate AI shot
    const aiDecision = calculateAIShot(
      aiTank,
      playerTank,
      currentState.terrain,
      currentState.aiDifficulty
    )

    // Update AI tank's angle and power (rounded to integers)
    actions.updateTank(aiTank.id, {
      angle: Math.round(aiDecision.angle),
      power: Math.round(aiDecision.power),
    })

    // Fire after thinking delay
    const tankIdToFire = aiTank.id
    aiTimeoutRef.current = window.setTimeout(() => {
      fireProjectileForTank(tankIdToFire)
    }, aiDecision.thinkingTimeMs)

    // Cleanup timeout on unmount or when no longer AI's turn
    return () => {
      if (aiTimeoutRef.current !== null) {
        window.clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAITurn])

  const handleStartGame = () => {
    actions.setPhase('terrain_select')
  }

  const handleTerrainSizeSelect = (size: TerrainSize) => {
    actions.setTerrainSize(size)
    actions.setPhase('enemy_select')
  }

  const handleEnemyCountSelect = (count: EnemyCount) => {
    actions.setEnemyCount(count)
    actions.setPhase('color_select')
  }

  const handleColorSelect = (color: TankColor) => {
    // Get terrain dimensions from selected size
    const terrainConfig = TERRAIN_SIZES[state.terrainSize]

    // Initialize game with terrain and tanks
    const { terrain, tanks } = initializeGame({
      canvasWidth: terrainConfig.width,
      canvasHeight: terrainConfig.height,
      playerColor: color,
      enemyCount: state.enemyCount,
    })

    // Store player's color choice
    actions.setPlayerColor(color)

    // Set terrain and tanks in game state
    actions.setTerrain(terrain)
    actions.initializeTanks(tanks)

    // Transition to playing phase
    actions.setPhase('playing')
  }

  const handlePlayAgain = () => {
    // Reset all game state and go back to loading screen
    actions.resetGame()
  }

  const handleAngleChange = (newAngle: number) => {
    const currentTank = state.tanks.find((t) => t.id === state.currentPlayerId)
    if (currentTank) {
      actions.updateTank(currentTank.id, { angle: newAngle })
    }
  }

  const handlePowerChange = (newPower: number) => {
    const currentTank = state.tanks.find((t) => t.id === state.currentPlayerId)
    if (currentTank) {
      actions.updateTank(currentTank.id, { power: newPower })
    }
  }

  const handleFire = () => {
    const currentTank = state.tanks.find((t) => t.id === state.currentPlayerId)
    if (!currentTank || isProjectileActive) return

    fireProjectileForTank(currentTank.id)
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

  const currentPlayerTank = state.tanks.find((t) => t.id === state.currentPlayerId)
  const isPlayerTurn = state.currentPlayerId === 'player'

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

    // Render tanks
    const hasActiveProjectiles = projectilesRef.current.some((p) => p.isActive)
    for (const tank of tanks) {
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

    for (const projectile of projectilesRef.current) {
      if (!projectile.isActive) {
        updatedProjectiles.push(projectile)
        continue
      }

      // Update trace points
      const updatedProjectile = updateProjectileTrace(projectile, currentTime)

      // Get current position
      const position = getProjectilePosition(updatedProjectile, currentTime)

      // Check if projectile is out of bounds
      const terrainHeight = terrain ? getInterpolatedHeightAt(terrain, position.x) ?? 0 : 0
      if (isProjectileOutOfBounds(position, ctx.canvas.width, ctx.canvas.height, terrainHeight)) {
        // Projectile has landed - mark as inactive
        updatedProjectiles.push({ ...updatedProjectile, isActive: false })

        // Create explosion at the landing position (in screen coordinates)
        // TODO: Support multiple simultaneous explosions in tanks-qr0
        if (!explosionRef.current?.isActive) {
          explosionRef.current = createExplosion(position, currentTime)
          setIsExplosionActive(true)
        }

        // Check for tank hits and apply damage
        for (const tank of tanks) {
          if (checkTankHit(position, tank, ctx.canvas.height)) {
            actions.damageTank(tank.id, EXPLOSION_DAMAGE)
          }
        }
      } else {
        // Projectile still active
        updatedProjectiles.push(updatedProjectile)
        anyProjectileActive = true

        // Render projectile
        renderProjectile(ctx, updatedProjectile, currentTime)
      }
    }

    // Update projectiles ref with new state
    projectilesRef.current = updatedProjectiles

    // Update isProjectileActive state if needed
    if (isProjectileActive && !anyProjectileActive) {
      setIsProjectileActive(false)
    }

    // Render and update explosion
    if (explosionRef.current?.isActive) {
      const explosion = explosionRef.current

      // Update explosion state
      explosionRef.current = updateExplosion(explosion, currentTime, deltaTime)

      // Render explosion
      renderExplosion(ctx, explosionRef.current, currentTime)

      // Check if explosion is complete
      if (isExplosionComplete(explosionRef.current, currentTime)) {
        explosionRef.current = { ...explosionRef.current, isActive: false }
        setIsExplosionActive(false)
        actions.nextTurn()
      }
    }
  }

  if (state.phase === 'loading') {
    return <LoadingScreen onStart={handleStartGame} />
  }

  if (state.phase === 'terrain_select') {
    return <TerrainSizeSelector onSizeSelect={handleTerrainSizeSelect} />
  }

  if (state.phase === 'enemy_select') {
    return <EnemyCountSelector onCountSelect={handleEnemyCountSelect} />
  }

  if (state.phase === 'color_select') {
    return <ColorSelectionScreen onColorSelect={handleColorSelect} />
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
        isPlayerTurn={isPlayerTurn}
      />
      {currentPlayerTank && (
        <>
          <ControlPanel
            angle={currentPlayerTank.angle}
            power={currentPlayerTank.power}
            onAngleChange={handleAngleChange}
            onPowerChange={handlePowerChange}
            onFire={handleFire}
            enabled={!isProjectileActive && !isExplosionActive && isPlayerTurn}
          />
        </>
      )}
    </div>
  )
}

export default App
