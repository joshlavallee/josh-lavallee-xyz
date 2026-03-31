import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SceneProps } from '@/features/photography/types'
import Dog from './Dog'
import Butterfly from './Butterfly'

const GROUND_COLOR = '#2A2A2A'
const GROUND_COLOR_LIGHT = '#E5E5E5'

const raycaster = new THREE.Raycaster()
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const pointerNDC = new THREE.Vector2()
const intersectPoint = new THREE.Vector3()

export default function AboutScene({ colorMode }: SceneProps) {
  const pointerTarget = useRef(new THREE.Vector3(1, 0, 1))
  const { camera } = useThree()

  useFrame(({ pointer }) => {
    pointerNDC.set(pointer.x, pointer.y)
    raycaster.setFromCamera(pointerNDC, camera)
    raycaster.ray.intersectPlane(groundPlane, intersectPoint)

    if (intersectPoint) {
      intersectPoint.x = THREE.MathUtils.clamp(intersectPoint.x, -4, 4)
      intersectPoint.z = THREE.MathUtils.clamp(intersectPoint.z, -4, 4)
      pointerTarget.current.copy(intersectPoint)
    }
  })

  const groundCol = colorMode === 'light' ? GROUND_COLOR_LIGHT : GROUND_COLOR

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 8, 5]} intensity={1.2} />
      <pointLight position={[-3, 4, -2]} intensity={0.3} color="#8B5CF6" />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color={groundCol} />
      </mesh>

      <Dog pointerTarget={pointerTarget} />
      <Butterfly pointerTarget={pointerTarget} />
    </>
  )
}
