import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'
import * as THREE from 'three'
import useDogAI from '../hooks/useDogAI'
import { SPHERE_RADIUS } from '../constants'

type ActionName =
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Idle'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Run'
  | 'AnimalArmature|AnimalArmature|AnimalArmature|Walk'

const IDLE = 'AnimalArmature|AnimalArmature|AnimalArmature|Idle' as ActionName
const WALK = 'AnimalArmature|AnimalArmature|AnimalArmature|Walk' as ActionName
const RUN = 'AnimalArmature|AnimalArmature|AnimalArmature|Run' as ActionName

interface DogProps {
  butterflyRef: React.RefObject<THREE.Group>
  sphereRef: React.RefObject<THREE.Group>
  inputActive: React.RefObject<{ active: boolean }>
  positionRef: React.RefObject<THREE.Vector3>
  headPositionRef: React.RefObject<THREE.Vector3>
  idleState: React.RefObject<'active' | 'settling' | 'perched'>
}

export default function Dog({ butterflyRef, sphereRef, inputActive, positionRef, headPositionRef, idleState }: DogProps) {
  const moveRef = useRef<THREE.Group>(null!)
  const animRef = useRef<THREE.Group>(null!)
  const { scene, animations } = useGLTF('/models/Dog.glb')
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { actions } = useAnimations(animations, animRef)
  const currentAnim = useRef<string>('')
  const { update: updateAI } = useDogAI(SPHERE_RADIUS)
  const up = useRef(new THREE.Vector3())
  const lookTarget = useRef(new THREE.Vector3())
  const butterflyWorldPosRef = useRef(new THREE.Vector3())
  const butterflyLocalRef = useRef(new THREE.Vector3())
  const headBoneRef = useRef<THREE.Bone | null>(null)

  useEffect(() => {
    const idle = actions[IDLE]
    if (idle) {
      idle.reset().fadeIn(0.3).play()
      currentAnim.current = IDLE
    }
  }, [actions])

  useEffect(() => {
    clone.traverse((child) => {
      if (child instanceof THREE.Bone && child.name.toLowerCase().includes('head')) {
        headBoneRef.current = child
      }
    })
  }, [clone])

  useFrame((_, delta) => {
    if (!moveRef.current || !butterflyRef.current || !sphereRef.current) return

    const butterflyWorldPos = butterflyRef.current.getWorldPosition(butterflyWorldPosRef.current)
    const active = inputActive.current?.active ?? false

    const result = updateAI(delta, butterflyWorldPos, sphereRef.current, active)

    // Position on sphere surface
    moveRef.current.position.copy(result.position)
    if (positionRef.current) {
      moveRef.current.getWorldPosition(positionRef.current)
    }

    if (headBoneRef.current && headPositionRef.current) {
      headBoneRef.current.getWorldPosition(headPositionRef.current)
    }

    // Orient along sphere surface: up = normal, look toward movement
    up.current.copy(result.position).normalize()

    // Calculate look direction along the surface tangent
    const butterflyLocal = butterflyLocalRef.current.copy(butterflyWorldPos)
    sphereRef.current.worldToLocal(butterflyLocal)
    lookTarget.current.copy(butterflyLocal).normalize().multiplyScalar(SPHERE_RADIUS)

    // Make the dog face the butterfly along the surface
    moveRef.current.up.copy(up.current)
    if (result.speed > 0.1) {
      moveRef.current.lookAt(lookTarget.current)
    }

    // Animation transitions
    let desiredAnim: ActionName = IDLE
    if (result.state === 'sprint') desiredAnim = RUN
    else if (result.state === 'overshoot') desiredAnim = result.speed > 0.5 ? RUN : WALK
    else if (result.state === 'trot') desiredAnim = WALK

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
    <group ref={moveRef} scale={0.5} dispose={null}>
      <group ref={animRef}>
        <primitive object={clone} />
      </group>
    </group>
  )
}

useGLTF.preload('/models/Dog.glb')
