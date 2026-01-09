import './App.css'
import { Canvas, LoadingScreen } from './components'
import { useGame } from './context/useGame'

function App() {
  const { state, actions } = useGame()

  const handleLoadingComplete = () => {
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

  return (
    <div className="app">
      {state.phase === 'loading' && (
        <LoadingScreen duration={6000} onComplete={handleLoadingComplete} />
      )}
      <h1>Scorched Earth Tanks</h1>
      <Canvas width={800} height={600} onRender={handleRender} />
    </div>
  )
}

export default App
