import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  Canvas,
  ColorSelectionScreen,
  ControlPanel,
  LoadingScreen,
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
  getNextDifficulty,
  type ProjectileState,
} from './engine'
import { TankColor } from './types/game'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

// Tank dimensions for hit detection (must match tank.ts)
const TANK_BODY_WIDTH = 40
const TANK_BODY_HEIGHT = 20
const TANK_WHEEL_RADIUS = 6

function App() {
  const { state, actions } = useGame()
  const projectileRef = useRef<ProjectileState | null>(null)
  const [isProjectileActive, setIsProjectileActive] = useState(false)
  const aiTimeoutRef = useRef<number | null>(null)

  // AI turn handler - only runs when turn changes to AI
  const isAITurn = state.phase === 'playing' && state.currentPlayerId !== 'player' && !isProjectileActive
  const aiProcessingRef = useRef(false)

  // Function to fire projectile (used by both player and AI)
  const fireProjectile = useCallback((tankId: string) => {
    const tank = state.tanks.find((t) => t.id === tankId)
    if (!tank || isProjectileActive) return

    // Start projectile animation
    projectileRef.current = createProjectileState(tank, performance.now(), CANVAS_HEIGHT)
    setIsProjectileActive(true)
  }, [state.tanks, isProjectileActive])

  useEffect(() => {
    // Only process when it's AI's turn and not already processing
    if (!isAITurn || aiProcessingRef.current) {
      return
    }

    const aiTank = state.tanks.find((t) => t.id === state.currentPlayerId)
    const playerTank = state.tanks.find((t) => t.id === 'player')

    if (!aiTank || !playerTank) {
      return
    }

    // Mark as processing to prevent re-entry
    aiProcessingRef.current = true

    // Calculate AI shot
    const aiDecision = calculateAIShot(
      aiTank,
      playerTank,
      state.terrain,
      state.aiDifficulty
    )

    // Update AI tank's angle and power
    actions.updateTank(aiTank.id, {
      angle: aiDecision.angle,
      power: aiDecision.power,
    })

    // Fire after thinking delay
    aiTimeoutRef.current = window.setTimeout(() => {
      aiProcessingRef.current = false
      fireProjectile(aiTank.id)
    }, aiDecision.thinkingTimeMs)

    // Cleanup timeout on unmount or turn change
    return () => {
      if (aiTimeoutRef.current !== null) {
        window.clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }
      aiProcessingRef.current = false
    }
  }, [isAITurn, state.currentPlayerId, state.tanks, state.terrain, state.aiDifficulty, actions, isProjectileActive, fireProjectile])

  const handleStartGame = () => {
    actions.setPhase('color_select')
  }

  const handleColorSelect = (color: TankColor) => {
    // Initialize game with terrain and tanks
    const { terrain, tanks } = initializeGame({
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      playerColor: color,
    })

    // Store player's color choice
    actions.setPlayerColor(color)

    // Set terrain and tanks in game state
    actions.setTerrain(terrain)
    actions.initializeTanks(tanks)

    // Transition to playing phase
    actions.setPhase('playing')
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

    fireProjectile(currentTank.id)
  }

  // Handle canvas click to cycle AI difficulty when clicking on opponent tank
  const handleCanvasClick = useCallback((canvasX: number, canvasY: number) => {
    // Only allow clicking during player's turn and not during projectile animation
    if (state.phase !== 'playing' || isProjectileActive) return

    const opponentTank = state.tanks.find((t) => t.id === 'opponent')
    if (!opponentTank) return

    // Convert world coordinates to canvas coordinates for hit detection
    const tankCanvasX = opponentTank.position.x
    const tankCanvasY = CANVAS_HEIGHT - opponentTank.position.y

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
    }
  }, [state.phase, state.tanks, state.aiDifficulty, isProjectileActive, actions])

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
    for (const tank of tanks) {
      const isCurrentTurn = tank.id === state.currentPlayerId && !projectileRef.current?.isActive
      // Show chevrons on opponent tank to indicate AI difficulty
      const chevronCount = tank.id === 'opponent' ? getChevronCount(state.aiDifficulty) : 0
      renderTank(ctx, tank, ctx.canvas.height, { isCurrentTurn, chevronCount })
    }

    // Render and update projectile
    if (projectileRef.current?.isActive) {
      const currentTime = performance.now()
      const projectile = projectileRef.current

      // Update trace points
      projectileRef.current = updateProjectileTrace(projectile, currentTime)

      // Get current position
      const position = getProjectilePosition(projectile, currentTime)

      // Check if projectile is out of bounds
      const terrainHeight = terrain ? getInterpolatedHeightAt(terrain, position.x) ?? 0 : 0
      if (isProjectileOutOfBounds(position, ctx.canvas.width, ctx.canvas.height, terrainHeight)) {
        // Projectile has landed - end animation and switch turns
        projectileRef.current = { ...projectile, isActive: false }
        setIsProjectileActive(false)
        actions.nextTurn()
      } else {
        // Render projectile
        renderProjectile(ctx, projectile, currentTime)
      }
    }
  }

  if (state.phase === 'loading') {
    return <LoadingScreen onStart={handleStartGame} />
  }

  if (state.phase === 'color_select') {
    return <ColorSelectionScreen onColorSelect={handleColorSelect} />
  }

  return (
    <div className="app">
      <Canvas width={CANVAS_WIDTH} height={CANVAS_HEIGHT} onRender={handleRender} onClick={handleCanvasClick} />
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
            enabled={!isProjectileActive && isPlayerTurn}
          />
        </>
      )}
    </div>
  )
}

export default App
