"use client"

import { useEffect, useRef, useCallback } from "react"

interface Vector2D {
  x: number
  y: number
}

class Particle {
  pos: Vector2D = { x: 0, y: 0 }
  vel: Vector2D = { x: 0, y: 0 }
  acc: Vector2D = { x: 0, y: 0 }
  target: Vector2D = { x: 0, y: 0 }

  closeEnoughTarget = 100
  maxSpeed = 4.0
  maxForce = 0.5
  particleSize = 3
  isKilled = false

  startColor = { r: 0, g: 0, b: 0 }
  targetColor = { r: 0, g: 0, b: 0 }
  colorWeight = 0
  colorBlendRate = 0.025

  move() {
    let proximityMult = 1
    const distance = Math.sqrt(
      Math.pow(this.pos.x - this.target.x, 2) + Math.pow(this.pos.y - this.target.y, 2)
    )

    if (distance < this.closeEnoughTarget) {
      proximityMult = distance / this.closeEnoughTarget
    }

    const towardsTarget = {
      x: this.target.x - this.pos.x,
      y: this.target.y - this.pos.y,
    }

    const magnitude = Math.sqrt(towardsTarget.x * towardsTarget.x + towardsTarget.y * towardsTarget.y)
    if (magnitude > 0) {
      towardsTarget.x = (towardsTarget.x / magnitude) * this.maxSpeed * proximityMult
      towardsTarget.y = (towardsTarget.y / magnitude) * this.maxSpeed * proximityMult
    }

    const steer = {
      x: towardsTarget.x - this.vel.x,
      y: towardsTarget.y - this.vel.y,
    }

    const steerMagnitude = Math.sqrt(steer.x * steer.x + steer.y * steer.y)
    if (steerMagnitude > 0) {
      steer.x = (steer.x / steerMagnitude) * this.maxForce
      steer.y = (steer.y / steerMagnitude) * this.maxForce
    }

    this.acc.x += steer.x
    this.acc.y += steer.y

    this.vel.x += this.acc.x
    this.vel.y += this.acc.y
    this.pos.x += this.vel.x
    this.pos.y += this.vel.y
    this.acc.x = 0
    this.acc.y = 0
  }

  draw(ctx: CanvasRenderingContext2D, DRAW_AS_POINTS: boolean) {
    if (this.colorWeight < 1.0) {
      this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1.0)
    }

    const currentColor = {
      r: Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight),
      g: Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight),
      b: Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight),
    }

    if (DRAW_AS_POINTS) {
      ctx.fillStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`
      ctx.fillRect(this.pos.x, this.pos.y, 2, 2)
    } else {
      ctx.fillStyle = `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})`
      ctx.beginPath()
      ctx.arc(this.pos.x, this.pos.y, this.particleSize / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  kill(width: number, height: number) {
    if (!this.isKilled) {
      const randomPos = this.generateRandomPos(width / 2, height / 2, (width + height) / 2)
      this.target.x = randomPos.x
      this.target.y = randomPos.y

      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      }
      this.targetColor = { r: 0, g: 0, b: 0 }
      this.colorWeight = 0

      this.isKilled = true
    }
  }

  private generateRandomPos(x: number, y: number, mag: number): Vector2D {
    const angle = Math.random() * Math.PI * 2
    return {
      x: x + Math.cos(angle) * mag,
      y: y + Math.sin(angle) * mag,
    }
  }
}

interface ParticleTextEffectProps {
  words?: string[]
  wordDuration?: number
  backgroundColor?: string
  className?: string
}

const DEFAULT_WORDS = ["Scorched", "eAIrth"]
const PIXEL_STEPS = 4
const DRAW_AS_POINTS = true

export function ParticleTextEffect({
  words = DEFAULT_WORDS,
  wordDuration = 2500,
  backgroundColor = "#1a1a1a",
  className = "",
}: ParticleTextEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const particlesRef = useRef<Particle[]>([])
  const wordIndexRef = useRef(0)
  const lastWordChangeRef = useRef(0)

  const generateRandomPos = useCallback((x: number, y: number, mag: number): Vector2D => {
    const angle = Math.random() * Math.PI * 2
    return {
      x: x + Math.cos(angle) * mag,
      y: y + Math.sin(angle) * mag,
    }
  }, [])

  const nextWord = useCallback((word: string, canvas: HTMLCanvasElement) => {
    const offscreenCanvas = document.createElement("canvas")
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    const offscreenCtx = offscreenCanvas.getContext("2d")!

    offscreenCtx.fillStyle = "white"
    offscreenCtx.font = "bold 80px Arial, sans-serif"
    offscreenCtx.textAlign = "center"
    offscreenCtx.textBaseline = "middle"
    offscreenCtx.fillText(word, canvas.width / 2, canvas.height / 2)

    const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data

    const newColor = {
      r: 50 + Math.floor(Math.random() * 200),
      g: 100 + Math.floor(Math.random() * 155),
      b: 50 + Math.floor(Math.random() * 200),
    }

    const particles = particlesRef.current
    let particleIndex = 0

    const coordinates: Vector2D[] = []
    for (let y = 0; y < canvas.height; y += PIXEL_STEPS) {
      for (let x = 0; x < canvas.width; x += PIXEL_STEPS) {
        const index = (y * canvas.width + x) * 4
        const alpha = pixels[index + 3]
        if (alpha !== undefined && alpha > 128) {
          coordinates.push({ x, y })
        }
      }
    }

    // Shuffle coordinates for more organic appearance
    for (let i = coordinates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = coordinates[i]
      const swap = coordinates[j]
      if (temp && swap) {
        coordinates[i] = swap
        coordinates[j] = temp
      }
    }

    // Assign particles to coordinates
    for (const coord of coordinates) {
      const existingParticle = particles[particleIndex]
      if (existingParticle) {
        existingParticle.target.x = coord.x
        existingParticle.target.y = coord.y
        existingParticle.isKilled = false

        existingParticle.startColor = {
          r: existingParticle.startColor.r + (existingParticle.targetColor.r - existingParticle.startColor.r) * existingParticle.colorWeight,
          g: existingParticle.startColor.g + (existingParticle.targetColor.g - existingParticle.startColor.g) * existingParticle.colorWeight,
          b: existingParticle.startColor.b + (existingParticle.targetColor.b - existingParticle.startColor.b) * existingParticle.colorWeight,
        }
        existingParticle.targetColor = { ...newColor }
        existingParticle.colorWeight = 0
      } else {
        const particle = new Particle()
        const randomPos = generateRandomPos(canvas.width / 2, canvas.height / 2, canvas.width)
        particle.pos.x = randomPos.x
        particle.pos.y = randomPos.y
        particle.target.x = coord.x
        particle.target.y = coord.y
        particle.targetColor = { ...newColor }
        particles.push(particle)
      }
      particleIndex++
    }

    // Kill excess particles
    for (let i = particleIndex; i < particles.length; i++) {
      const particle = particles[i]
      if (particle) {
        particle.kill(canvas.width, canvas.height)
      }
    }
  }, [generateRandomPos])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const currentWord = words[wordIndexRef.current]
      if (currentWord) {
        nextWord(currentWord, canvas)
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    lastWordChangeRef.current = performance.now()

    const animate = (currentTime: number) => {
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Cycle words based on duration
      if (currentTime - lastWordChangeRef.current > wordDuration) {
        wordIndexRef.current = (wordIndexRef.current + 1) % words.length
        const nextWordText = words[wordIndexRef.current]
        if (nextWordText) {
          nextWord(nextWordText, canvas)
        }
        lastWordChangeRef.current = currentTime
      }

      const particles = particlesRef.current
      for (const particle of particles) {
        particle.move()
        particle.draw(ctx, DRAW_AS_POINTS)
      }

      // Remove particles that are far off screen and dead
      particlesRef.current = particles.filter((p) => {
        if (!p.isKilled) return true
        const dist = Math.sqrt(
          Math.pow(p.pos.x - canvas.width / 2, 2) + Math.pow(p.pos.y - canvas.height / 2, 2)
        )
        return dist < canvas.width + canvas.height
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [words, wordDuration, backgroundColor, nextWord])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  )
}
