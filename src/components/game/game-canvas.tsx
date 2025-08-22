"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"

interface GameCanvasProps {
  multiplier: number
  phase: "betting" | "flying" | "crashed" | "preparing"
  timeLeft?: number
  gameStartTime?: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  type: "spark" | "smoke" | "explosion" | "trail" | "star" | "debris" | "warp" | "quantum" | "plasma"
  rotation?: number
  rotationSpeed?: number
  opacity?: number
  intensity?: number
}

interface Star {
  x: number
  y: number
  size: number
  twinkle: number
  speed: number
  parallax: number
  color: string
}

interface TrailPoint {
  x: number
  y: number
  alpha: number
  size: number
  color: string
  multiplier: number
  timestamp: number
  velocity: { x: number; y: number }
}

interface WarpField {
  x: number
  y: number
  radius: number
  intensity: number
  rotation: number
  color: string
}

export function GameCanvas({ multiplier, phase, timeLeft, gameStartTime }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const lastFrameTime = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const starsRef = useRef<Star[]>([])
  const trailPointsRef = useRef<TrailPoint[]>([])
  const warpFieldsRef = useRef<WarpField[]>([])
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [animationTime, setAnimationTime] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Responsive canvas sizing with performance optimization
  const updateDimensions = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    if (!container) return

    const rect = container.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, 2) // Cap at 2x for performance

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.scale(dpr, dpr)
      // Enable hardware acceleration
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
    }

    canvas.style.width = rect.width + "px"
    canvas.style.height = rect.height + "px"

    setDimensions({ width: rect.width, height: rect.height })
  }, [])

  useEffect(() => {
    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    const container = canvasRef.current?.parentElement
    if (container) {
      resizeObserver.observe(container)
    }
    return () => resizeObserver.disconnect()
  }, [updateDimensions])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Initialize enhanced starfield with different star types
    const initStars = () => {
      starsRef.current = []
      const starCount = Math.floor((dimensions.width * dimensions.height) / 3000)

      for (let i = 0; i < starCount; i++) {
        const starType = Math.random()
        starsRef.current.push({
          x: Math.random() * dimensions.width,
          y: Math.random() * dimensions.height,
          size: starType > 0.9 ? Math.random() * 3 + 2 : Math.random() * 1.5 + 0.5,
          twinkle: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.03 + 0.01,
          parallax: Math.random() * 0.8 + 0.2,
          color: starType > 0.95 ? "#00d4ff" : starType > 0.9 ? "#ff6b35" : "#ffffff",
        })
      }
    }

    initStars()

    // Enhanced color palette for USS Protostar
    const colors = {
      background: "#000814",
      backgroundGradient: "#001d3d",
      nebula: "#7209b7",
      stars: "#ffffff",
      ship: {
        hull: "#2a9d8f",
        hullHighlight: "#43aa8b",
        hullShadow: "#264653",
        nacelle: "#e76f51",
        nacelleGlow: "#f4a261",
        bridge: "#457b9d",
        bridgeGlow: "#a8dadc",
        deflector: "#06ffa5",
        deflectorGlow: "#40e0d0",
        quantum: "#7209b7",
      },
      engine: {
        core: "#ffffff",
        hot: "#00d4ff",
        warm: "#0077be",
        plasma: "#7209b7",
        trail: "#06ffa5",
        warp: "#ff6b35",
        quantum: "#e0aaff",
      },
      explosion: {
        core: "#ffffff",
        hot: "#ffbe0b",
        warm: "#fb8500",
        cool: "#ff006e",
        debris: "#8ecae6",
        shockwave: "#06ffa5",
      },
      ui: {
        text: "#ffffff",
        glow: "#06ffa5",
        success: "#06ffa5",
        warning: "#ffbe0b",
        danger: "#ff006e",
        quantum: "#e0aaff",
      },
    }

    // ULTRA-DYNAMIC FLIGHT PATH - Much more visible movement!
    const calculateShipPosition = (currentMultiplier: number, time: number) => {
      // Much more aggressive movement parameters
      const baseX = dimensions.width * 0.08 // Start closer to left edge
      const maxX = dimensions.width * 0.92 // End closer to right edge
      const baseY = dimensions.height * 0.85 // Start lower
      const maxY = dimensions.height * 0.05 // Go much higher

      // FASTER horizontal movement - ship crosses screen much quicker
      const horizontalSpeed = 3.5 // Increased from 1.5
      const horizontalProgress = Math.min(Math.log(currentMultiplier * horizontalSpeed) / Math.log(100), 1)
      const x = baseX + (maxX - baseX) * horizontalProgress

      // MORE DRAMATIC vertical curve - exponential with steeper climb
      const verticalIntensity = 2.2 // Increased intensity
      const verticalProgress = Math.min(Math.pow((currentMultiplier - 1) / 15, 0.6) * verticalIntensity, 1)
      const y = baseY - (baseY - maxY) * verticalProgress

      // ENHANCED turbulence that scales with multiplier and speed
      const turbulenceBase = 3 + currentMultiplier * 1.2
      const speedTurbulence = horizontalProgress * 8
      const turbulenceX = Math.sin(time * 0.02) * turbulenceBase + Math.cos(time * 0.035) * speedTurbulence
      const turbulenceY =
        Math.cos(time * 0.025) * (turbulenceBase * 0.7) + Math.sin(time * 0.04) * (speedTurbulence * 0.5)

      // DRAMATIC banking/rotation based on flight path
      const bankAngle = (horizontalProgress * 0.3 + verticalProgress * 0.2) * Math.sin(time * 0.03)

      return {
        x: x + turbulenceX,
        y: y + turbulenceY,
        horizontalProgress,
        verticalProgress,
        bankAngle,
        speed: horizontalProgress + verticalProgress,
      }
    }

    // SPECTACULAR particle system with new types
    const createParticles = (x: number, y: number, count: number, type: Particle["type"], intensity = 1) => {
      const newParticles: Particle[] = []
      for (let i = 0; i < count * intensity; i++) {
        let particle: Particle

        switch (type) {
          case "explosion":
            particle = {
              x: x + (Math.random() - 0.5) * 60,
              y: y + (Math.random() - 0.5) * 60,
              vx: (Math.random() - 0.5) * 30,
              vy: (Math.random() - 0.5) * 30,
              life: 120,
              maxLife: 120,
              color: [colors.explosion.core, colors.explosion.hot, colors.explosion.warm, colors.explosion.cool][
                Math.floor(Math.random() * 4)
              ],
              size: Math.random() * 20 + 10,
              type: "explosion",
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 0.4,
              intensity,
            }
            break
          case "quantum":
            particle = {
              x: x + (Math.random() - 0.5) * 25,
              y: y + (Math.random() - 0.5) * 25,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 90,
              maxLife: 90,
              color: [colors.engine.quantum, colors.ship.quantum, colors.ui.quantum][Math.floor(Math.random() * 3)],
              size: Math.random() * 8 + 4,
              type: "quantum",
              opacity: 0.9,
              intensity,
            }
            break
          case "plasma":
            particle = {
              x: x + (Math.random() - 0.5) * 20,
              y: y + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 6,
              vy: Math.random() * 6 + 2,
              life: 80,
              maxLife: 80,
              color: [colors.engine.plasma, colors.engine.hot, colors.engine.warm][Math.floor(Math.random() * 3)],
              size: Math.random() * 6 + 3,
              type: "plasma",
              opacity: 0.85,
              intensity,
            }
            break
          case "warp":
            particle = {
              x: x + (Math.random() - 0.5) * 15,
              y: y + (Math.random() - 0.5) * 15,
              vx: (Math.random() - 0.5) * 5,
              vy: Math.random() * 5 + 2,
              life: 100,
              maxLife: 100,
              color: [colors.engine.warp, colors.engine.hot, colors.engine.core][Math.floor(Math.random() * 3)],
              size: Math.random() * 7 + 3,
              type: "warp",
              opacity: 0.9,
              intensity,
            }
            break
          case "trail":
            particle = {
              x: x + (Math.random() - 0.5) * 12,
              y: y + (Math.random() - 0.5) * 12,
              vx: (Math.random() - 0.5) * 4,
              vy: Math.random() * 4 + 1,
              life: 70,
              maxLife: 70,
              color: [colors.engine.trail, colors.engine.hot, colors.engine.plasma][Math.floor(Math.random() * 3)],
              size: Math.random() * 5 + 2,
              type: "trail",
              opacity: 0.8,
              intensity,
            }
            break
          case "spark":
            particle = {
              x,
              y,
              vx: (Math.random() - 0.5) * 20,
              vy: (Math.random() - 0.5) * 20,
              life: 50,
              maxLife: 50,
              color: colors.engine.core,
              size: Math.random() * 4 + 1,
              type: "spark",
              intensity,
            }
            break
          default:
            particle = {
              x,
              y,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              life: 60,
              maxLife: 60,
              color: colors.ui.glow,
              size: Math.random() * 6 + 2,
              type: "star",
              intensity,
            }
        }

        newParticles.push(particle)
      }
      particlesRef.current = [...particlesRef.current, ...newParticles]
    }

    // Enhanced particle physics
    const updateParticles = () => {
      particlesRef.current = particlesRef.current
        .map((particle) => {
          const newParticle = {
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            life: particle.life - 1,
            vx: particle.vx * (particle.type === "smoke" ? 0.99 : 0.97),
            vy: particle.vy * 0.97 + (particle.type === "smoke" ? -0.3 : 0.15),
            size: particle.type === "smoke" ? particle.size * 1.05 : particle.size * 0.98,
          }

          if (particle.rotation !== undefined && particle.rotationSpeed !== undefined) {
            newParticle.rotation = particle.rotation + particle.rotationSpeed
          }

          return newParticle
        })
        .filter((particle) => particle.life > 0 && particle.size > 0.1)
    }

    // SPECTACULAR particle rendering with enhanced effects
    const drawParticles = () => {
      particlesRef.current.forEach((particle) => {
        const alpha = (particle.life / particle.maxLife) * (particle.opacity || 1)
        ctx.save()
        ctx.globalAlpha = alpha

        if (particle.type === "explosion") {
          ctx.translate(particle.x, particle.y)
          if (particle.rotation) ctx.rotate(particle.rotation)

          // Multi-layer explosion effect
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size)
          gradient.addColorStop(0, particle.color)
          gradient.addColorStop(0.3, particle.color + "DD")
          gradient.addColorStop(0.7, particle.color + "77")
          gradient.addColorStop(1, "transparent")

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(0, 0, particle.size, 0, Math.PI * 2)
          ctx.fill()

          // Inner core
          ctx.fillStyle = colors.explosion.core
          ctx.beginPath()
          ctx.arc(0, 0, particle.size * 0.3, 0, Math.PI * 2)
          ctx.fill()
        } else if (particle.type === "quantum") {
          // Quantum particle with pulsing effect
          const pulseSize = particle.size * (1 + Math.sin(animationTime * 0.1 + particle.x) * 0.3)

          ctx.shadowColor = particle.color
          ctx.shadowBlur = pulseSize * 3
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2)
          ctx.fill()

          // Quantum field effect
          ctx.strokeStyle = particle.color + "44"
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, pulseSize * 2, 0, Math.PI * 2)
          ctx.stroke()
        } else if (particle.type === "plasma") {
          // Plasma with electric arcs
          const gradient = ctx.createRadialGradient(
            particle.x,
            particle.y,
            0,
            particle.x,
            particle.y,
            particle.size * 2,
          )
          gradient.addColorStop(0, particle.color)
          gradient.addColorStop(0.5, particle.color + "AA")
          gradient.addColorStop(1, "transparent")

          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2)
          ctx.fill()

          ctx.shadowColor = particle.color
          ctx.shadowBlur = particle.size * 4
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Standard particles with enhanced glow
          ctx.shadowColor = particle.color
          ctx.shadowBlur = particle.size * 4
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      })
    }

    // Enhanced starfield with parallax and color variety
    const drawStars = (shipSpeed: number) => {
      starsRef.current.forEach((star) => {
        // Parallax movement based on ship speed
        if (phase === "flying") {
          star.x -= shipSpeed * star.parallax * 2
          if (star.x < -10) {
            star.x = dimensions.width + 10
            star.y = Math.random() * dimensions.height
          }
        }

        star.twinkle += star.speed
        const alpha = 0.4 + Math.sin(star.twinkle) * 0.5

        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = star.color
        ctx.shadowColor = star.color
        ctx.shadowBlur = star.size * 4
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
    }

    // Dynamic space grid with warp effects
    const drawSpaceGrid = (shipSpeed: number) => {
      const gridSize = Math.min(dimensions.width, dimensions.height) / 12
      const gridOffset = phase === "flying" ? (animationTime * shipSpeed * 100) % gridSize : 0
      const alpha = 0.08 + Math.sin(animationTime * 0.02) * 0.04
      const warpIntensity = Math.min(shipSpeed * 2, 1)

      ctx.strokeStyle = `rgba(6, 255, 165, ${alpha * (1 + warpIntensity)})`
      ctx.lineWidth = 1 + warpIntensity
      ctx.setLineDash([8, 20])

      // Warped grid lines
      for (let y = -gridOffset; y < dimensions.height + gridSize; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)

        // Add warp curvature
        if (phase === "flying") {
          const segments = 20
          for (let i = 0; i <= segments; i++) {
            const x = (dimensions.width / segments) * i
            const warpY = y + Math.sin((x / dimensions.width) * Math.PI * 2 + animationTime * 0.05) * warpIntensity * 10
            ctx.lineTo(x, warpY)
          }
        } else {
          ctx.lineTo(dimensions.width, y)
        }
        ctx.stroke()
      }

      ctx.setLineDash([])
    }

    // SPECTACULAR USS Protostar with enhanced details and animations
    const drawUSSProtostar = (shipPos: any) => {
      const { x, y, bankAngle, speed } = shipPos

      // Responsive ship scaling
      const baseScale = Math.min(dimensions.width, dimensions.height) / 600
      const speedScale = 1 + speed * 0.3 // Ship grows slightly with speed
      const shipScale = baseScale * speedScale

      const shipLength = 120 * shipScale
      const shipWidth = 60 * shipScale

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(bankAngle)
      ctx.scale(1 + speed * 0.1, 1) // Slight stretch effect at high speed

      // QUANTUM WARP FIELDS - Multiple layers
      if (phase === "flying") {
        const warpIntensity = Math.min(multiplier / 5, 3)

        // Create warp field distortions
        for (let i = 0; i < 3; i++) {
          const fieldRadius = (40 + i * 20) * shipScale * warpIntensity
          const fieldAlpha = (0.3 - i * 0.08) * warpIntensity

          const warpGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, fieldRadius)
          warpGradient.addColorStop(0, `rgba(114, 9, 183, ${fieldAlpha})`)
          warpGradient.addColorStop(0.5, `rgba(6, 255, 165, ${fieldAlpha * 0.7})`)
          warpGradient.addColorStop(1, "transparent")

          ctx.fillStyle = warpGradient
          ctx.beginPath()
          ctx.arc(0, 0, fieldRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ENHANCED ENGINE EFFECTS
      const enginePower = 0.8 + Math.sin(animationTime * 0.15) * 0.2 + Math.min(multiplier * 0.1, 1)
      const engineGlowRadius = 50 * shipScale * enginePower

      // Port nacelle warp core
      const portGradient = ctx.createRadialGradient(
        -shipLength * 0.4,
        -shipWidth * 0.4,
        0,
        -shipLength * 0.4,
        -shipWidth * 0.4,
        engineGlowRadius,
      )
      portGradient.addColorStop(0, colors.engine.core)
      portGradient.addColorStop(0.2, colors.engine.hot)
      portGradient.addColorStop(0.5, colors.engine.warm)
      portGradient.addColorStop(0.8, colors.engine.warp)
      portGradient.addColorStop(1, "transparent")

      ctx.fillStyle = portGradient
      ctx.beginPath()
      ctx.arc(-shipLength * 0.4, -shipWidth * 0.4, engineGlowRadius, 0, Math.PI * 2)
      ctx.fill()

      // Starboard nacelle warp core
      const starboardGradient = ctx.createRadialGradient(
        -shipLength * 0.4,
        shipWidth * 0.4,
        0,
        -shipLength * 0.4,
        shipWidth * 0.4,
        engineGlowRadius,
      )
      starboardGradient.addColorStop(0, colors.engine.core)
      starboardGradient.addColorStop(0.2, colors.engine.hot)
      starboardGradient.addColorStop(0.5, colors.engine.warm)
      starboardGradient.addColorStop(0.8, colors.engine.warp)
      starboardGradient.addColorStop(1, "transparent")

      ctx.fillStyle = starboardGradient
      ctx.beginPath()
      ctx.arc(-shipLength * 0.4, shipWidth * 0.4, engineGlowRadius, 0, Math.PI * 2)
      ctx.fill()

      // SHIP SHADOW for depth
      ctx.save()
      ctx.translate(6, 6)
      ctx.globalAlpha = 0.5
      ctx.fillStyle = "#000000"
      ctx.beginPath()
      ctx.ellipse(0, 0, shipLength * 0.8, shipWidth * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // MAIN HULL (Primary Saucer Section)
      const hullGradient = ctx.createRadialGradient(shipLength * 0.3, 0, 0, shipLength * 0.3, 0, shipWidth * 0.8)
      hullGradient.addColorStop(0, colors.ship.hullHighlight)
      hullGradient.addColorStop(0.4, colors.ship.hull)
      hullGradient.addColorStop(0.8, colors.ship.hullShadow)
      hullGradient.addColorStop(1, colors.ship.hullShadow + "AA")

      ctx.fillStyle = hullGradient
      ctx.beginPath()
      ctx.ellipse(shipLength * 0.3, 0, shipLength * 0.6, shipWidth * 0.7, 0, 0, Math.PI * 2)
      ctx.fill()

      // SECONDARY HULL (Engineering Section)
      const engineeringGradient = ctx.createLinearGradient(0, -shipWidth * 0.3, 0, shipWidth * 0.3)
      engineeringGradient.addColorStop(0, colors.ship.hullHighlight)
      engineeringGradient.addColorStop(0.5, colors.ship.hull)
      engineeringGradient.addColorStop(1, colors.ship.hullShadow)

      ctx.fillStyle = engineeringGradient
      ctx.beginPath()
      ctx.ellipse(-shipLength * 0.2, 0, shipLength * 0.4, shipWidth * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()

      // WARP NACELLES with enhanced details
      const nacelleGradient = ctx.createLinearGradient(0, -shipWidth * 0.25, 0, shipWidth * 0.25)
      nacelleGradient.addColorStop(0, colors.ship.nacelleGlow)
      nacelleGradient.addColorStop(0.5, colors.ship.nacelle)
      nacelleGradient.addColorStop(1, colors.ship.hullShadow)

      ctx.fillStyle = nacelleGradient
      // Port nacelle
      ctx.beginPath()
      ctx.ellipse(-shipLength * 0.3, -shipWidth * 0.45, shipLength * 0.5, shipWidth * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
      // Starboard nacelle
      ctx.beginPath()
      ctx.ellipse(-shipLength * 0.3, shipWidth * 0.45, shipLength * 0.5, shipWidth * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()

      // BUSSARD COLLECTORS (Glowing front sections)
      ctx.fillStyle = colors.ship.nacelleGlow
      ctx.shadowColor = colors.ship.nacelleGlow
      ctx.shadowBlur = 25
      ctx.beginPath()
      ctx.ellipse(-shipLength * 0.55, -shipWidth * 0.45, shipLength * 0.15, shipWidth * 0.12, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(-shipLength * 0.55, shipWidth * 0.45, shipLength * 0.15, shipWidth * 0.12, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // BRIDGE SECTION with enhanced lighting
      const bridgeGradient = ctx.createRadialGradient(shipLength * 0.4, 0, 0, shipLength * 0.4, 0, shipWidth * 0.3)
      bridgeGradient.addColorStop(0, colors.ship.bridgeGlow)
      bridgeGradient.addColorStop(0.6, colors.ship.bridge)
      bridgeGradient.addColorStop(1, colors.ship.hullShadow)

      ctx.fillStyle = bridgeGradient
      ctx.beginPath()
      ctx.ellipse(shipLength * 0.4, 0, shipLength * 0.2, shipWidth * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()

      // MAIN DEFLECTOR DISH with quantum pulsing
      const deflectorPulse = 0.8 + Math.sin(animationTime * 0.12) * 0.3
      const deflectorGradient = ctx.createRadialGradient(
        shipLength * 0.2,
        0,
        0,
        shipLength * 0.2,
        0,
        shipWidth * 0.15 * deflectorPulse,
      )
      deflectorGradient.addColorStop(0, colors.ship.deflectorGlow)
      deflectorGradient.addColorStop(0.7, colors.ship.deflector)
      deflectorGradient.addColorStop(1, "transparent")

      ctx.fillStyle = deflectorGradient
      ctx.shadowColor = colors.ship.deflectorGlow
      ctx.shadowBlur = 30 * deflectorPulse
      ctx.beginPath()
      ctx.arc(shipLength * 0.2, 0, shipWidth * 0.12 * deflectorPulse, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // HULL DETAILS and WINDOWS
      ctx.fillStyle = colors.ship.bridgeGlow
      // Bridge windows
      for (let i = 0; i < 7; i++) {
        const windowX = shipLength * 0.35 + i * 10 * shipScale
        const windowY = (i % 2 === 0 ? -1 : 1) * shipWidth * 0.1
        ctx.beginPath()
        ctx.arc(windowX, windowY, 2 * shipScale, 0, Math.PI * 2)
        ctx.fill()
      }

      // Hull panel lines
      ctx.strokeStyle = colors.ship.hullHighlight + "77"
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(shipLength * 0.3, 0, shipLength * 0.5, shipWidth * 0.6, 0, 0, Math.PI * 2)
      ctx.stroke()

      // QUANTUM FIELD GENERATORS (New detail)
      if (multiplier > 3) {
        ctx.fillStyle = colors.ship.quantum
        ctx.shadowColor = colors.ship.quantum
        ctx.shadowBlur = 15

        // Port quantum field generator
        ctx.beginPath()
        ctx.arc(-shipLength * 0.1, -shipWidth * 0.25, 4 * shipScale, 0, Math.PI * 2)
        ctx.fill()

        // Starboard quantum field generator
        ctx.beginPath()
        ctx.arc(-shipLength * 0.1, shipWidth * 0.25, 4 * shipScale, 0, Math.PI * 2)
        ctx.fill()

        ctx.shadowBlur = 0
      }

      ctx.restore()

      // CREATE SPECTACULAR PARTICLE EFFECTS
      if (phase === "flying") {
        const particleIntensity = Math.min(multiplier / 3, 2)

        // Engine trail particles
        if (Math.random() < 0.9) {
          createParticles(x - shipLength * 0.7, y - shipWidth * 0.4, 3, "warp", particleIntensity)
          createParticles(x - shipLength * 0.7, y + shipWidth * 0.4, 3, "warp", particleIntensity)
        }

        // Quantum particles at high multipliers
        if (multiplier > 5 && Math.random() < 0.6) {
          createParticles(x, y, 2, "quantum", particleIntensity)
        }

        // Plasma discharge at extreme multipliers
        if (multiplier > 8 && Math.random() < 0.4) {
          createParticles(x - shipLength * 0.3, y, 1, "plasma", particleIntensity)
        }

        // Sparks from hull stress
        if (multiplier > 10 && Math.random() < 0.3) {
          createParticles(x + shipLength * 0.2, y, 1, "spark", particleIntensity)
        }
      }
    }

    // ENHANCED flight trail with multiplier visualization
    const drawQuantumFlightTrail = (currentPos: any) => {
      if (phase === "flying") {
        // Add current position with enhanced data
        trailPointsRef.current.push({
          x: currentPos.x,
          y: currentPos.y,
          alpha: 1,
          size: 6 + Math.min(multiplier * 0.5, 8),
          color: multiplier > 5 ? colors.engine.quantum : colors.engine.trail,
          multiplier: multiplier,
          timestamp: animationTime,
          velocity: { x: currentPos.speed * 2, y: currentPos.speed },
        })

        // Dynamic trail length based on speed and screen size
        const maxTrailLength = Math.floor(dimensions.width / 6 + currentPos.speed * 20)
        if (trailPointsRef.current.length > maxTrailLength) {
          trailPointsRef.current.shift()
        }

        // Update trail with enhanced fading
        trailPointsRef.current.forEach((point, index) => {
          point.alpha = (index / trailPointsRef.current.length) * 0.9
          point.size *= 0.998
        })

        trailPointsRef.current = trailPointsRef.current.filter((point) => point.alpha > 0.05)

        // Draw SPECTACULAR multi-layered trail
        if (trailPointsRef.current.length > 1) {
          // Outer quantum field
          ctx.strokeStyle = colors.engine.quantum + "44"
          ctx.lineWidth = 8
          ctx.lineCap = "round"
          ctx.lineJoin = "round"

          ctx.beginPath()
          trailPointsRef.current.forEach((point, index) => {
            ctx.globalAlpha = point.alpha * 0.3
            if (index === 0) {
              ctx.moveTo(point.x, point.y)
            } else {
              ctx.lineTo(point.x, point.y)
            }
          })
          ctx.stroke()

          // Middle plasma layer
          ctx.strokeStyle = colors.engine.hot
          ctx.lineWidth = 4

          ctx.beginPath()
          trailPointsRef.current.forEach((point, index) => {
            ctx.globalAlpha = point.alpha * 0.6
            if (index === 0) {
              ctx.moveTo(point.x, point.y)
            } else {
              ctx.lineTo(point.x, point.y)
            }
          })
          ctx.stroke()

          // Inner core trail
          ctx.strokeStyle = colors.engine.core
          ctx.lineWidth = 2

          ctx.beginPath()
          trailPointsRef.current.forEach((point, index) => {
            ctx.globalAlpha = point.alpha
            if (index === 0) {
              ctx.moveTo(point.x, point.y)
            } else {
              ctx.lineTo(point.x, point.y)
            }
          })
          ctx.stroke()

          ctx.globalAlpha = 1
        }
      } else {
        trailPointsRef.current = []
      }
    }

    // DYNAMIC multiplier display with spectacular effects
    const drawMultiplierDisplay = () => {
      const fontSize = Math.min(dimensions.width, dimensions.height) / 8
      const textX = dimensions.width / 2
      const textY = dimensions.height / 3

      const multiplierText = `${multiplier.toFixed(2)}x`

      // Dynamic effects based on multiplier
      const pulseIntensity = phase === "flying" ? 1 + Math.sin(animationTime * 0.2) * 0.3 : 1
      const glowIntensity = Math.min(multiplier / 5, 3)
      const trembleEffect = multiplier > 8 ? (Math.random() - 0.5) * 4 : 0

      ctx.save()
      ctx.translate(textX + trembleEffect, textY + trembleEffect)
      ctx.scale(pulseIntensity, pulseIntensity)

      // Background quantum field effect
      if (phase === "flying" && multiplier > 3) {
        const bgSize = 200 + Math.sin(animationTime * 0.1) * 50 + multiplier * 10
        const bgAlpha = 0.15 + Math.sin(animationTime * 0.1) * 0.1

        ctx.save()
        ctx.globalAlpha = bgAlpha
        const bgGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bgSize)
        bgGradient.addColorStop(0, colors.ui.quantum)
        bgGradient.addColorStop(0.4, colors.engine.hot)
        bgGradient.addColorStop(0.8, colors.engine.warp)
        bgGradient.addColorStop(1, "transparent")
        ctx.fillStyle = bgGradient
        ctx.beginPath()
        ctx.arc(0, 0, bgSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      // Enhanced text rendering
      ctx.font = `bold ${fontSize}px system-ui`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Multiple glow layers
      for (let i = 0; i < 3; i++) {
        ctx.shadowColor = multiplier > 5 ? colors.ui.quantum : colors.ui.glow
        ctx.shadowBlur = (30 + i * 10) * glowIntensity
        ctx.strokeStyle = multiplier > 5 ? colors.ui.quantum : colors.ui.glow
        ctx.lineWidth = 4 - i
        ctx.strokeText(multiplierText, 0, 0)
      }

      // Main text
      ctx.shadowBlur = 0
      ctx.fillStyle = colors.ui.text
      ctx.fillText(multiplierText, 0, 0)

      ctx.restore()
    }

    // Enhanced phase indicator
    const drawPhaseIndicator = () => {
      const fontSize = Math.min(dimensions.width, dimensions.height) / 20
      const textX = dimensions.width / 2
      const textY = dimensions.height - Math.max(60, dimensions.height * 0.1)

      let phaseText = ""
      let phaseColor = colors.ui.text
      let pulseEffect = false

      switch (phase) {
        case "betting":
          phaseText = timeLeft ? `🚀 WARP JUMP IN ${Math.ceil(timeLeft / 1000)}s` : "🎯 PREPARE FOR WARP!"
          phaseColor = colors.ui.warning
          pulseEffect = true
          break
        case "flying":
          const altitude = Math.round(
            ((dimensions.height * 0.85 - Math.max(0, dimensions.height * 0.85)) / (dimensions.height * 0.8)) * 100,
          )
          phaseText = `🌌 QUANTUM FLIGHT ACTIVE - ALTITUDE: ${altitude}%`
          phaseColor = colors.ui.success
          break
        case "crashed":
          phaseText = "💥 WARP CORE BREACH - SHIP DESTROYED!"
          phaseColor = colors.ui.danger
          pulseEffect = true
          break
        case "preparing":
          phaseText = "🔧 QUANTUM DRIVE CHARGING..."
          phaseColor = colors.ui.glow
          break
      }

      const textSize = pulseEffect ? fontSize * (1 + Math.sin(animationTime * 0.3) * 0.2) : fontSize
      const trembleEffect = phase === "crashed" ? (Math.random() - 0.5) * 8 : 0

      ctx.save()
      ctx.translate(textX + trembleEffect, textY + trembleEffect)
      ctx.font = `bold ${textSize}px system-ui`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.shadowColor = phaseColor
      ctx.shadowBlur = pulseEffect ? 15 + Math.sin(animationTime * 0.3) * 10 : 12
      ctx.fillStyle = phaseColor
      ctx.fillText(phaseText, 0, 0)
      ctx.restore()
    }

    // MAIN ANIMATION LOOP with enhanced performance and stability
    const animate = (currentTime: number) => {
      // Prevent infinite loops and ensure stable frame rate
      if (!isAnimating || !ctx) {
        return;
      }

      // Calculate delta time for smooth animation
      const deltaTime = currentTime - lastFrameTime.current;
      lastFrameTime.current = currentTime;

      // Update animation time with delta time
      setAnimationTime((prev) => {
        const newTime = prev + Math.min(deltaTime / 1000, 0.016); // Cap at 60fps
        return newTime;
      });

      try {
        // Dynamic background with nebula effects
        const bgGradient = ctx.createRadialGradient(
          dimensions.width / 2,
          dimensions.height / 2,
          0,
          dimensions.width / 2,
          dimensions.height / 2,
          Math.max(dimensions.width, dimensions.height),
        )
        bgGradient.addColorStop(0, colors.backgroundGradient)
        bgGradient.addColorStop(0.7, colors.background)
        bgGradient.addColorStop(1, "#000000")

        ctx.fillStyle = bgGradient
        ctx.fillRect(0, 0, dimensions.width, dimensions.height)

        // Calculate ship position with enhanced movement
        const shipPosition = calculateShipPosition(multiplier, animationTime)

        // Draw all elements in optimal order
        drawStars(shipPosition.speed)
        drawSpaceGrid(shipPosition.speed)
        updateParticles()
        drawParticles()
        drawQuantumFlightTrail(shipPosition)

        // Draw USS Protostar or explosion
        if (phase === "crashed") {
          // Create spectacular explosion
          if (Math.random() < 0.5) {
            createParticles(shipPosition.x, shipPosition.y, 8, "explosion", 2)
          }
        } else {
          drawUSSProtostar(shipPosition)
        }

        // Draw UI elements
        drawMultiplierDisplay()
        drawPhaseIndicator()
      } catch (error) {
        console.error('Animation error:', error);
        // Stop animation on error to prevent infinite loops
        setIsAnimating(false);
        return;
      }

      if (isAnimating) {
        animationRef.current = requestAnimationFrame(animate);
      }
    }

    // Start animation
    setIsAnimating(true);
    lastFrameTime.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      setIsAnimating(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  }, [multiplier, phase, timeLeft, dimensions])

  return (
    <Card className="w-full h-full bg-black border-slate-800 overflow-hidden relative">
      <CardContent className="p-0 h-full relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{
            minHeight: "400px",
            maxHeight: "90vh",
          }}
        />

        {/* SPECTACULAR overlay effects */}
        <AnimatePresence>
          {phase === "flying" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at ${30 + Math.sin(animationTime * 0.05) * 30}% ${40 + Math.cos(animationTime * 0.05) * 25}%, rgba(6, 255, 165, 0.2) 0%, rgba(0, 212, 255, 0.15) 30%, rgba(255, 107, 53, 0.08) 60%, transparent 80%)`,
              }}
            />
          )}

          {phase === "crashed" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 0.9, 1, 0.7, 1, 0.8],
                scale: [0.5, 1.8, 1.2, 1.6, 1.1, 1.4, 1.15],
              }}
              exit={{ opacity: 0, scale: 2 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 50% 45%, rgba(255, 190, 11, 0.6) 0%, rgba(255, 0, 110, 0.5) 25%, rgba(251, 133, 0, 0.4) 45%, rgba(255, 107, 53, 0.3) 65%, transparent 85%)",
              }}
            />
          )}

          {phase === "betting" && timeLeft && timeLeft < 5000 && (
            <motion.div
              animate={{
                opacity: [0.4, 1, 0.4],
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 0.8,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="absolute inset-0 pointer-events-none border-4 border-cyan-400/80 rounded-lg shadow-2xl shadow-cyan-400/40"
            />
          )}

          {phase === "flying" && multiplier > 10 && (
            <motion.div
              animate={{
                opacity: [0.6, 1, 0.6],
                scale: [0.98, 1.08, 0.98],
              }}
              transition={{
                duration: 0.2,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, rgba(224, 170, 255, 0.3) 0%, rgba(114, 9, 183, 0.2) 40%, transparent 70%)",
                filter: "blur(1px)",
              }}
            />
          )}
        </AnimatePresence>

        {/* ENHANCED responsive status indicators */}
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 text-cyan-300/95 text-xs sm:text-sm font-mono bg-black/50 backdrop-blur-md rounded-lg px-2 py-1 sm:px-4 sm:py-2 border border-cyan-500/40 shadow-xl shadow-cyan-500/20">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${phase === "flying" ? "bg-green-400 animate-pulse" : phase === "crashed" ? "bg-red-400" : "bg-yellow-400"}`}
            />
            <span>PHASE: {phase.toUpperCase()}</span>
          </div>
          {phase === "flying" && (
            <div className="text-xs text-cyan-400/90 mt-1 flex items-center gap-2">
              <span>MULT: {multiplier.toFixed(2)}x</span>
              {multiplier > 5 && <span className="text-purple-400">⚡ QUANTUM</span>}
              {multiplier > 10 && <span className="text-red-400 animate-pulse">🔥 CRITICAL</span>}
            </div>
          )}
        </div>

        {phase === "flying" && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 backdrop-blur-md rounded-lg sm:rounded-xl px-3 py-2 sm:px-6 sm:py-3 text-cyan-300 font-bold text-sm sm:text-lg border border-cyan-400/60 shadow-2xl shadow-cyan-400/30"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="text-lg"
              >
                🚀
              </motion.div>
              <span>QUANTUM FLIGHT</span>
            </div>
          </motion.div>
        )}

        {phase === "flying" && multiplier > 6 && (
          <motion.div
            animate={{
              opacity: [0.8, 1, 0.8],
              scale: [0.96, 1.12, 0.96],
            }}
            transition={{
              duration: 0.3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="absolute bottom-4 left-2 sm:left-4 bg-gradient-to-r from-red-500/40 to-orange-500/40 backdrop-blur-md rounded-lg sm:rounded-xl px-3 py-2 sm:px-5 sm:py-3 text-red-300 font-bold text-xs sm:text-sm border border-red-400/70 shadow-2xl shadow-red-400/30"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
              >
                ⚠️
              </motion.div>
              <span>WARP STRESS CRITICAL</span>
            </div>
          </motion.div>
        )}

        {phase === "flying" && multiplier > 12 && (
          <motion.div
            animate={{
              opacity: [0.9, 1, 0.9],
              x: [0, 3, -3, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 0.15,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            className="absolute bottom-4 right-2 sm:right-4 bg-gradient-to-r from-purple-500/50 to-pink-500/50 backdrop-blur-md rounded-lg sm:rounded-xl px-3 py-2 sm:px-5 sm:py-3 text-purple-200 font-bold text-xs sm:text-sm border border-purple-400/80 shadow-2xl shadow-purple-400/40"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 180, 360] }}
                transition={{ duration: 0.3, repeat: Number.POSITIVE_INFINITY }}
              >
                🌀
              </motion.div>
              <span>QUANTUM OVERLOAD</span>
            </div>
          </motion.div>
        )}

        {phase === "crashed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-red-900/80 backdrop-blur-lg rounded-2xl px-8 py-6 border-2 border-red-500/60 shadow-2xl shadow-red-500/50">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
                className="text-4xl sm:text-6xl font-bold text-red-300 text-center"
              >
                💥 WARP CORE BREACH 💥
              </motion.div>
              <div className="text-lg sm:text-xl text-red-400 text-center mt-2">
                Final Multiplier: {multiplier.toFixed(2)}x
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
