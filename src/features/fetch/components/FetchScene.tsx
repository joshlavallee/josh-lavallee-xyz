import { useRef } from 'react'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import useInput from '../hooks/useInput'
import SphereWorld from './SphereWorld'
import Butterfly from './Butterfly'
import Dog from './Dog'

export default function FetchScene({ colorMode }: SceneProps) {
  const input = useInput()
  const butterflyRef = useRef<THREE.Group>(null!)
  const sphereRef = useRef<THREE.Group>(null!)

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />

      <SphereWorld input={input} ref={sphereRef}>
        <Dog
          butterflyRef={butterflyRef}
          sphereRef={sphereRef}
          inputActive={input}
        />
      </SphereWorld>
      <Butterfly input={input} ref={butterflyRef} />
    </>
  )
}
