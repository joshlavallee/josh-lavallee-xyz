import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'

type ActionName =
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Death'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Headbutt'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Idle'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Idle_Eating'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Jump_Loop'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Jump_Start'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Run'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Walk'

const MOVE_SPEED = 1.2
const RUN_SPEED = 2.2
const STOP_THRESHOLD = 0.5
const RUN_THRESHOLD = 1.2

const IDLE = 'AnimalArmature|AnimalArmature|AnimalArmature|Idle' as ActionName
const WALK = 'AnimalArmature|AnimalArmature|AnimalArmature|Walk' as ActionName
const RUN = 'AnimalArmature|AnimalArmature|AnimalArmature|Run' as ActionName

interface DogProps {
  butterflyPosition: React.RefObject<THREE.Vector3>
  positionRef: React.RefObject<THREE.Vector3>
  isIdle: React.RefObject<boolean>
}

export default function Dog({ butterflyPosition, positionRef, isIdle }: DogProps) {
  const moveRef = useRef<THREE.Group>(null!)
  const animRef = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF('/models/Dog.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { actions } = useAnimations(animations, animRef)

  const stateRef = useRef({
    posX: 0,
    posZ: 0,
    rotY: 0,
    currentAnim: '' as string,
    wasMoving: false,
    shouldRun: false,
  })

  useEffect(() => {
    const idle = actions[IDLE]
    if (idle) {
      idle.reset().fadeIn(0.3).play()
      stateRef.current.currentAnim = IDLE
    }
  }, [actions])

  useFrame((_, delta) => {
    const s = stateRef.current
    if (!moveRef.current || !butterflyPosition.current) return

    if (isIdle.current) {
      // When idle, just face the butterfly and sit
      const dx = butterflyPosition.current.x - s.posX
      const dz = butterflyPosition.current.z - s.posZ
      if (dx !== 0 || dz !== 0) {
        const targetRot = Math.atan2(dx, dz)
        s.rotY = THREE.MathUtils.lerp(s.rotY, targetRot, 0.03)
      }

      moveRef.current.rotation.y = s.rotY

      const desiredAnim = IDLE
      if (desiredAnim !== s.currentAnim) {
        const prev = actions[s.currentAnim as ActionName]
        const next = actions[desiredAnim]
        if (next) {
          prev?.fadeOut(0.2)
          next.reset().fadeIn(0.2).play()
          s.currentAnim = desiredAnim
        }
      }
    } else {
      // --- existing chase logic starts here ---
      const targetX = butterflyPosition.current.x
      const targetZ = butterflyPosition.current.z
      const dx = targetX - s.posX
      const dz = targetZ - s.posZ
      const dist = Math.sqrt(dx * dx + dz * dz)

      const isMoving = dist > STOP_THRESHOLD
      const shouldRun = dist > RUN_THRESHOLD

      if (isMoving) {
        const speed = shouldRun ? RUN_SPEED : MOVE_SPEED
        const moveAmount = Math.min(speed * delta, dist)
        s.posX += (dx / dist) * moveAmount
        s.posZ += (dz / dist) * moveAmount

        const targetRot = Math.atan2(dx, dz)
        s.rotY = THREE.MathUtils.lerp(s.rotY, targetRot, 0.06)
      } else {
        if (dx !== 0 || dz !== 0) {
          const targetRot = Math.atan2(dx, dz)
          s.rotY = THREE.MathUtils.lerp(s.rotY, targetRot, 0.03)
        }
      }

      moveRef.current.position.x = s.posX
      moveRef.current.position.z = s.posZ
      moveRef.current.rotation.y = s.rotY

      // Animation transitions
      const desiredAnim = isMoving ? (shouldRun ? RUN : WALK) : IDLE
      if (desiredAnim !== s.currentAnim) {
        const prev = actions[s.currentAnim as ActionName]
        const next = actions[desiredAnim]
        if (next) {
          prev?.fadeOut(0.2)
          next.reset().fadeIn(0.2).play()
          s.currentAnim = desiredAnim
        }
      }
    }

    // Update shared position ref (always, both branches)
    positionRef.current.set(s.posX, 0, s.posZ)
  })

  return (
    <group ref={moveRef} position={[0, 0, 0]} scale={0.5} dispose={null}>
      <group ref={animRef}>
        <primitive object={clone} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/Dog.glb')
