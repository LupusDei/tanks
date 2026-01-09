import { useEffect, useRef } from 'react'
import './App.css'
import {
  Canvas,
  ColorSelectionScreen,
  ControlPanel,
  LoadingScreen,
  TurnIndicator,
} from './components'
import { useGame } from './context/useGame'
import { initializeGame, renderTank, calculateAIShot } from './engine'
import { TankColor } from './types/game'

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

function App() {
  const { state, actions } = useGame()
  const aiTimeoutRef = useRef<number | null>(null)

  // AI turn handler - only runs when turn changes to AI
  const isAITurn = state.phase === 'playing' && state.currentPlayerId !== 'player'
  const aiProcessingRef = useRef(false)

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
      actions.nextTurn()
    }, aiDecision.thinkingTimeMs)

    // Cleanup timeout on unmount or turn change
    return () => {
      if (aiTimeoutRef.current !== null) {
        window.clearTimeout(aiTimeoutRef.current)
        aiTimeoutRef.current = null
      }
      aiProcessingRef.current = false
    }
  }, [isAITurn, state.currentPlayerId, state.tanks, state.terrain, state.aiDifficulty, actions])

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
    // For now, just switch turns
    // Projectile animation will be added in tanks-xfa
    actions.nextTurn()
  }

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
      renderTank(ctx, tank, ctx.canvas.height)
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
      <Canvas width={CANVAS_WIDTH} height={CANVAS_HEIGHT} onRender={handleRender} />
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
          />
        </>
      )}
    </div>
  )
}

export default App
