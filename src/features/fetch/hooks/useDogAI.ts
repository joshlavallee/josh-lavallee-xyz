import { useRef } from 'react'
import * as THREE from 'three'

type ChaseState = 'idle' | 'sprint' | 'overshoot' | 'trot'

const SPRINT_SPEED = 2.5
const TROT_SPEED = 0.8
const OVERSHOOT_DECEL = 3.0
const SPRINT_THRESHOLD = 0.8
const OVERSHOOT_TRIGGER = 0.4
const OVERSHOOT_MIN_SPEED = 0.2
const SPRINT_DELAY_MIN = 0.1
const SPRINT_DELAY_MAX = 0.3

interface DogAIState {
  state: ChaseState
  speed: number
  theta: number
  phi: number
  direction: THREE.Vector2
  overshootTimer: number
  sprintDelay: number
  sprintDelayTimer: number
}

export default function useDogAI(sphereRadius: number) {
  const ai = useRef<DogAIState>({
    state: 'idle',
    speed: 0,
    theta: Math.PI / 4,
    phi: Math.PI / 2,
    direction: new THREE.Vector2(0, 1),
    overshootTimer: 0,
    sprintDelay: 0,
    sprintDelayTimer: 0,
  })

  const tempVec3 = useRef(new THREE.Vector3())
  const tempVec3b = useRef(new THREE.Vector3())

  function sphericalToCartesian(theta: number, phi: number): THREE.Vector3 {
    return tempVec3.current.set(
      sphereRadius * Math.sin(phi) * Math.sin(theta),
      sphereRadius * Math.cos(phi),
      sphereRadius * Math.sin(phi) * Math.cos(theta),
    )
  }

  function getTargetAngles(
    butterflyWorldPos: THREE.Vector3,
    sphereGroup: THREE.Group,
  ): { theta: number; phi: number } {
    const local = tempVec3b.current.copy(butterflyWorldPos)
    sphereGroup.worldToLocal(local)
    local.normalize().multiplyScalar(sphereRadius)

    const phi = Math.acos(Math.max(-1, Math.min(1, local.y / sphereRadius)))
    const theta = Math.atan2(local.x, local.z)
    return { theta, phi }
  }

  function update(
    delta: number,
    butterflyWorldPos: THREE.Vector3,
    sphereGroup: THREE.Group,
    inputActive: boolean,
  ): {
    position: THREE.Vector3
    state: ChaseState
    speed: number
  } {
    const s = ai.current
    const target = getTargetAngles(butterflyWorldPos, sphereGroup)

    const dTheta = target.theta - s.theta
    const dPhi = target.phi - s.phi
    const angularDist = Math.sqrt(dTheta * dTheta + dPhi * dPhi)

    switch (s.state) {
      case 'idle':
        s.speed = 0
        if (inputActive && angularDist > SPRINT_THRESHOLD) {
          s.state = 'sprint'
          s.sprintDelay = SPRINT_DELAY_MIN + Math.random() * (SPRINT_DELAY_MAX - SPRINT_DELAY_MIN)
          s.sprintDelayTimer = 0
        }
        break

      case 'sprint':
        s.sprintDelayTimer += delta
        if (s.sprintDelayTimer < s.sprintDelay) {
          s.speed = 0
          break
        }
        s.speed = SPRINT_SPEED
        if (angularDist > 0.001) {
          s.direction.set(dTheta / angularDist, dPhi / angularDist)
        }
        if (angularDist < OVERSHOOT_TRIGGER) {
          s.state = 'overshoot'
          s.overshootTimer = 0
        }
        break

      case 'overshoot':
        s.overshootTimer += delta
        s.speed = Math.max(s.speed - OVERSHOOT_DECEL * delta, 0)
        if (s.speed < OVERSHOOT_MIN_SPEED) {
          s.state = inputActive ? 'trot' : 'idle'
          s.speed = inputActive ? TROT_SPEED : 0
        }
        break

      case 'trot':
        s.speed = TROT_SPEED
        if (angularDist > 0.001) {
          s.direction.set(dTheta / angularDist, dPhi / angularDist)
        }
        if (angularDist > SPRINT_THRESHOLD) {
          s.state = 'sprint'
          s.sprintDelay = SPRINT_DELAY_MIN + Math.random() * (SPRINT_DELAY_MAX - SPRINT_DELAY_MIN)
          s.sprintDelayTimer = 0
        }
        if (!inputActive && angularDist < OVERSHOOT_TRIGGER) {
          s.state = 'idle'
          s.speed = 0
        }
        break
    }

    // Apply movement in spherical coordinates
    const step = s.speed * delta
    s.theta += s.direction.x * step
    s.phi += s.direction.y * step

    // Clamp phi to upper hemisphere (don't let dog go underneath)
    s.phi = Math.max(0.15, Math.min(Math.PI / 2 + 0.5, s.phi))

    const position = sphericalToCartesian(s.theta, s.phi)

    return { position: position.clone(), state: s.state, speed: s.speed }
  }

  return { update, ai }
}
