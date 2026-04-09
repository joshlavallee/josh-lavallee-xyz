import { useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import useInput from '../hooks/useInput'
import SphereWorld from './SphereWorld'
import Butterfly from './Butterfly'
import Dog from './Dog'
import GrassField from './GrassField'
import DayEnvironment from './DayEnvironment'
import NightEnvironment from './NightEnvironment'

export default function FetchScene({ colorMode }: SceneProps) {
  const input = useInput()
  const butterflyRef = useRef<THREE.Group>(null!)
  const sphereRef = useRef<THREE.Group>(null!)
  const dogPositionRef = useRef(new THREE.Vector3())
  const nightBlend = colorMode === 'dark' ? 1.0 : 0.0

  // Set scene background based on mode
  const { scene } = useThree()
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
        />
      </SphereWorld>
      <Butterfly input={input} ref={butterflyRef} />
    </>
  )
}
