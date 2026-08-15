import { useEffect, useRef } from 'react'
import './CursorGrid.css'

const FALLOFF_CURVES = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  sharp: (t) => t * t * t,
}

const hexToRgb = (hex) => {
  const value = hex.replace('#', '')
  const normalized = value.length === 3 ? value.split('').map((c) => c + c).join('') : value
  const number = parseInt(normalized.slice(0, 6), 16)
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255]
}

const CursorGrid = ({
  cellSize = 70,
  color = '#D946EF',
  radius = 140,
  falloff = 'smooth',
  holdTime = 400,
  fadeDuration = 800,
  lineWidth = 1.2,
  maxOpacity = 1,
  fillOpacity = 0,
  gridOpacity = 0,
  cellRadius = 0,
  clickPulse = true,
  pulseSpeed = 600,
  className = '',
}) => {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const propsRef = useRef({})
  const wakeRef = useRef(null)

  propsRef.current = {
    cellSize,
    color,
    radius,
    falloff,
    holdTime,
    fadeDuration,
    lineWidth,
    maxOpacity,
    fillOpacity,
    gridOpacity,
    cellRadius,
    clickPulse,
    pulseSpeed,
  }

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!container || !canvas || !ctx) return undefined

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let cols = 0
    let rows = 0
    let offX = 0
    let offY = 0
    let width = 0
    let height = 0
    let alphas = new Float32Array(0)
    let touched = new Float64Array(0)
    const pulses = []
    let raf = 0
    let running = false
    let lastFrame = 0

    const rebuild = () => {
      const p = propsRef.current
      width = container.offsetWidth
      height = container.offsetHeight
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(width / p.cellSize) + 1
      rows = Math.ceil(height / p.cellSize) + 1
      offX = (width - cols * p.cellSize) / 2
      offY = (height - rows * p.cellSize) / 2
      alphas = new Float32Array(cols * rows)
      touched = new Float64Array(cols * rows)
    }

    const cellCenter = (index) => {
      const p = propsRef.current
      return [
        offX + (index % cols) * p.cellSize + p.cellSize / 2,
        offY + Math.floor(index / cols) * p.cellSize + p.cellSize / 2,
      ]
    }

    const energize = (x, y, boost = 1) => {
      const p = propsRef.current
      const r = Math.max(p.radius, 1)
      const ease = FALLOFF_CURVES[p.falloff] || FALLOFF_CURVES.linear
      const now = performance.now()
      const minCol = Math.max(0, Math.floor((x - r - offX) / p.cellSize))
      const maxCol = Math.min(cols - 1, Math.floor((x + r - offX) / p.cellSize))
      const minRow = Math.max(0, Math.floor((y - r - offY) / p.cellSize))
      const maxRow = Math.min(rows - 1, Math.floor((y + r - offY) / p.cellSize))

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          const index = row * cols + col
          const [cx, cy] = cellCenter(index)
          const distance = Math.hypot(cx - x, cy - y)
          if (distance > r) continue
          const level = ease(1 - distance / r) * p.maxOpacity * boost
          if (level > alphas[index]) alphas[index] = level
          if (level > 0) touched[index] = now
        }
      }
    }

    const draw = (now) => {
      const p = propsRef.current
      const dt = Math.min(now - lastFrame, 50)
      lastFrame = now
      ctx.clearRect(0, 0, width, height)
      const [red, green, blue] = hexToRgb(p.color)

      if (p.gridOpacity > 0) {
        ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${p.gridOpacity})`
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let col = 0; col <= cols; col += 1) {
          const x = Math.round(offX + col * p.cellSize) + 0.5
          ctx.moveTo(x, 0)
          ctx.lineTo(x, height)
        }
        for (let row = 0; row <= rows; row += 1) {
          const y = Math.round(offY + row * p.cellSize) + 0.5
          ctx.moveTo(0, y)
          ctx.lineTo(width, y)
        }
        ctx.stroke()
      }

      for (let pulseIndex = pulses.length - 1; pulseIndex >= 0; pulseIndex -= 1) {
        const pulse = pulses[pulseIndex]
        const ringRadius = ((now - pulse.started) / 1000) * p.pulseSpeed
        if (ringRadius > Math.hypot(width, height)) {
          pulses.splice(pulseIndex, 1)
          continue
        }
        const band = p.cellSize
        for (let index = 0; index < alphas.length; index += 1) {
          const [cx, cy] = cellCenter(index)
          const distance = Math.hypot(cx - pulse.x, cy - pulse.y)
          if (Math.abs(distance - ringRadius) < band / 2 && p.maxOpacity > alphas[index]) {
            alphas[index] = p.maxOpacity
            touched[index] = now
          }
        }
      }

      let visible = pulses.length > 0
      const fadeStep = dt / Math.max(p.fadeDuration, 16)
      const half = p.cellSize / 2
      for (let index = 0; index < alphas.length; index += 1) {
        let alpha = alphas[index]
        if (alpha <= 0) continue
        if (now - touched[index] > p.holdTime) {
          alpha = Math.max(0, alpha - fadeStep)
          alphas[index] = alpha
          if (alpha <= 0) continue
        }
        visible = true
        const [cx, cy] = cellCenter(index)
        const gradient = ctx.createRadialGradient(cx, cy, half * 0.1, cx, cy, p.cellSize)
        gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${alpha})`)
        gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`)
        const x = cx - half + 0.5
        const y = cy - half + 0.5
        const size = p.cellSize - 1
        ctx.beginPath()
        if (p.cellRadius > 0) ctx.roundRect(x, y, size, size, p.cellRadius)
        else ctx.rect(x, y, size, size)
        if (p.fillOpacity > 0) {
          ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha * p.fillOpacity})`
          ctx.fill()
        }
        ctx.strokeStyle = gradient
        ctx.lineWidth = p.lineWidth
        ctx.stroke()
      }

      if (visible) raf = requestAnimationFrame(draw)
      else {
        running = false
        if (p.gridOpacity <= 0) ctx.clearRect(0, 0, width, height)
      }
    }

    const wake = () => {
      if (running) return
      running = true
      lastFrame = performance.now()
      raf = requestAnimationFrame(draw)
    }
    wakeRef.current = wake

    const toLocal = (event) => {
      const rect = canvas.getBoundingClientRect()
      return [event.clientX - rect.left, event.clientY - rect.top]
    }
    const onPointerMove = (event) => {
      const [x, y] = toLocal(event)
      if (x < 0 || x > width || y < 0 || y > height) return
      energize(x, y)
      wake()
    }
    const onPointerDown = (event) => {
      const p = propsRef.current
      if (!p.clickPulse) return
      const [x, y] = toLocal(event)
      if (x < 0 || x > width || y < 0 || y > height) return
      pulses.push({ x, y, started: performance.now() })
      wake()
    }

    const resizeObserver = new ResizeObserver(() => {
      rebuild()
      wake()
    })
    resizeObserver.observe(container)
    rebuild()
    wake()
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerdown', onPointerDown)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerdown', onPointerDown)
      wakeRef.current = null
    }
  }, [cellSize])

  useEffect(() => {
    wakeRef.current?.()
  }, [gridOpacity, color, lineWidth, maxOpacity, fillOpacity, cellRadius])

  return (
    <div ref={containerRef} className={`cursor-grid${className ? ` ${className}` : ''}`}>
      <canvas ref={canvasRef} className="cursor-grid__canvas" />
    </div>
  )
}

export default CursorGrid
