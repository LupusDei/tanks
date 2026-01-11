import { MetalBackground } from './MetalBackground';
import { Canvas } from './Canvas';

/**
 * Container component that wraps the game canvas with an industrial metal background.
 * The metal frame surrounds the canvas and provides animated visual effects.
 */

interface GameContainerProps {
  /** Canvas width (inner game area) */
  canvasWidth: number;
  /** Canvas height (inner game area) */
  canvasHeight: number;
  /** Render callback for the canvas */
  onRender: (ctx: CanvasRenderingContext2D) => void;
  /** Click handler for the canvas */
  onClick?: (x: number, y: number) => void;
}

/** Width of the metal frame border in pixels */
const FRAME_BORDER_WIDTH = 60;

export function GameContainer({
  canvasWidth,
  canvasHeight,
  onRender,
  onClick,
}: GameContainerProps) {
  // Total dimensions including the metal frame
  const totalWidth = canvasWidth + FRAME_BORDER_WIDTH * 2;
  const totalHeight = canvasHeight + FRAME_BORDER_WIDTH * 2;

  return (
    <div
      className="game-container"
      style={{
        position: 'relative',
        width: totalWidth,
        height: totalHeight,
        maxWidth: '100vw',
        maxHeight: '100vh',
      }}
    >
      {/* Metal background frame */}
      <MetalBackground
        width={totalWidth}
        height={totalHeight}
        innerWidth={canvasWidth}
        innerHeight={canvasHeight}
        borderWidth={FRAME_BORDER_WIDTH}
      />

      {/* Game canvas (sits in the window cut out of the metal frame) */}
      <div
        className="game-canvas-wrapper"
        style={{
          position: 'absolute',
          top: FRAME_BORDER_WIDTH,
          left: FRAME_BORDER_WIDTH,
          width: canvasWidth,
          height: canvasHeight,
        }}
      >
        <Canvas
          width={canvasWidth}
          height={canvasHeight}
          onRender={onRender}
          onClick={onClick}
        />
      </div>
    </div>
  );
}
