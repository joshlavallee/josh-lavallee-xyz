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

const IDLE = 'AnimalArmature|AnimalArmature|AnimalArmature|Idle' as ActionName
const WALK = 'AnimalArmature|AnimalArmature|AnimalArmature|Walk' as ActionName
const RUN = 'AnimalArmature|AnimalArmature|AnimalArmature|Run' as ActionName

interface DogProps {
  sphereRadius: number
  isMoving: React.RefObject<boolean>
  isFast: React.RefObject<boolean>
  facingAngle: React.RefObject<number>
}

export default function Dog({ sphereRadius, isMoving, isFast, facingAngle }: DogProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const animRef = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF('/models/Dog.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { actions } = useAnimations(animations, animRef)

  const currentAnim = useRef('')

  useEffect(() => {
    const idle = actions[IDLE]
    if (idle) {
      idle.reset().fadeIn(0.3).play()
      currentAnim.current = IDLE
    }
  }, [actions])

  useFrame(() => {
    if (!groupRef.current) return

    // Face the direction of movement (derived from sphere rotation)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      facingAngle.current,
      0.08,
    )

    // Animation based on movement state
    const desiredAnim = isMoving.current ? (isFast.current ? RUN : WALK) : IDLE
    if (desiredAnim !== currentAnim.current) {
      const prev = actions[currentAnim.current as ActionName]
      const next = actions[desiredAnim]
      if (next) {
        prev?.fadeOut(0.2)
        next.reset().fadeIn(0.2).play()
        currentAnim.current = desiredAnim
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, sphereRadius, 0]} scale={0.5} dispose={null}>
      <group ref={animRef}>
        <primitive object={clone} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/Dog.glb')
