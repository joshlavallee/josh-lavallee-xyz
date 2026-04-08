import * as THREE from 'three'

interface TouchPoint {
  x: number
  y: number
  age: number
  force: number
}

const MAX_AGE = 120
const RADIUS = 0.08
const TRAIL_SIZE = 64

function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2)
}

export default class TouchTexture {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  texture: THREE.CanvasTexture
  private points: TouchPoint[] = []
  private lastPoint: { x: number; y: number } | null = null

  constructor(size = TRAIL_SIZE) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = size
    this.canvas.height = size
    this.ctx = this.canvas.getContext('2d')!

    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.minFilter = THREE.NearestFilter
    this.texture.magFilter = THREE.NearestFilter

    this.clear()
  }

  clear() {
    this.ctx.fillStyle = 'black'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  addTouch(x: number, y: number) {
    let force = 0
    if (this.lastPoint) {
      const dx = x - this.lastPoint.x
      const dy = y - this.lastPoint.y
      force = Math.min(Math.sqrt(dx * dx + dy * dy) * 10, 1)
    }
    this.lastPoint = { x, y }
    this.points.push({ x, y, age: 0, force: Math.max(force, 0.2) })
  }

  update() {
    if (this.points.length === 0) return

    this.clear()

    for (let i = this.points.length - 1; i >= 0; i--) {
      const point = this.points[i]
      point.age++

      if (point.age > MAX_AGE) {
        this.points.splice(i, 1)
        continue
      }

      const progress = point.age / MAX_AGE
      let intensity: number
      if (progress < 0.3) {
        intensity = easeOutSine(progress / 0.3)
      } else {
        intensity = easeOutSine(1 - (progress - 0.3) / 0.7)
      }

      intensity *= point.force

      this.drawPoint(point.x, point.y, intensity)
    }

    this.texture.needsUpdate = true
  }

  private drawPoint(x: number, y: number, intensity: number) {
    const px = x * this.canvas.width
    const py = (1 - y) * this.canvas.height
    const radius = RADIUS * this.canvas.width

    const gradient = this.ctx.createRadialGradient(px, py, 0, px, py, radius)
    gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 0.3})`)
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    this.ctx.beginPath()
    this.ctx.fillStyle = gradient
    this.ctx.arc(px, py, radius, 0, Math.PI * 2)
    this.ctx.fill()
  }

  dispose() {
    this.texture.dispose()
  }
}
