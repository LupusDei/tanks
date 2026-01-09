import './App.css'
import { Canvas, ColorSelectionScreen, LoadingScreen } from './components'
import { useGame } from './context/useGame'
import { TankColor } from './types/game'

function App() {
  const { state, actions } = useGame()

  const handleStartGame = () => {
    actions.setPhase('color_select')
  }

  const handleColorSelect = (color: TankColor) => {
    actions.setPlayerColor(color)
    actions.setPhase('playing')
  }

  const handleRender = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    ctx.fillStyle = '#00ff00'
    ctx.font = '24px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Scorched Earth Tanks', ctx.canvas.width / 2, ctx.canvas.height / 2)

    ctx.font = '16px monospace'
    ctx.fillText('Canvas Ready', ctx.canvas.width / 2, ctx.canvas.height / 2 + 40)
  }

  if (state.phase === 'loading') {
    return <LoadingScreen onStart={handleStartGame} />
  }

  if (state.phase === 'color_select') {
    return <ColorSelectionScreen onColorSelect={handleColorSelect} />
  }

  return (
    <div className="app">
      <h1>Scorched Earth Tanks</h1>
      <Canvas width={800} height={600} onRender={handleRender} />
    </div>
  )
}

export default App
