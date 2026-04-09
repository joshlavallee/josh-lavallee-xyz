import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import useInput from '../hooks/useInput'
import SphereWorld from './SphereWorld'
import Butterfly from './Butterfly'
import Dog from './Dog'
import GrassField from './GrassField'
import DayEnvironment from './DayEnvironment'
import NightEnvironment from './NightEnvironment'
import VirtualJoystick from './VirtualJoystick'

export default function FetchScene({ colorMode }: SceneProps) {
  const { state: input, setJoystick } = useInput()
  const butterflyRef = useRef<THREE.Group>(null!)
  const sphereRef = useRef<THREE.Group>(null!)
  const dogPositionRef = useRef(new THREE.Vector3())
  const nightBlend = colorMode === 'dark' ? 1.0 : 0.0

  const idleState = useRef<'active' | 'settling' | 'perched'>('active')
  const idleTimer = useRef(0)
  const dogHeadPosition = useRef(new THREE.Vector3())
  const IDLE_TIMEOUT = 2.0

  useFrame((_, delta) => {
    const active = input.current?.active ?? false
    if (active) {
      idleTimer.current = 0
      idleState.current = 'active'
    } else {
      idleTimer.current += delta
      if (idleTimer.current > IDLE_TIMEOUT && idleState.current === 'active') {
        idleState.current = 'settling'
      }
    }
  })

  // Override camera position for fetch scene
  const { scene, camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 8, 8)
    camera.lookAt(0, 0, 0)
  }, [camera])
  scene.background = colorMode === 'light'
    ? new THREE.Color('#87CEEB')
    : new THREE.Color('#0a0a1a')

  return (
    <>
      {colorMode === 'light' ? <DayEnvironment /> : <NightEnvironment />}

      <SphereWorld input={input} ref={sphereRef}>
        <GrassField dogPositionRef={dogPositionRef} nightBlend={nightBlend} />
        <Dog
          butterflyRef={butterflyRef}
          sphereRef={sphereRef}
          inputActive={input}
          positionRef={dogPositionRef}
          headPositionRef={dogHeadPosition}
          idleState={idleState}
        />
      </SphereWorld>
      <Butterfly
        input={input}
        ref={butterflyRef}
        idleState={idleState}
        dogHeadPosition={dogHeadPosition}
      />
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <VirtualJoystick onInput={setJoystick} />
      </Html>
    </>
  )
}
