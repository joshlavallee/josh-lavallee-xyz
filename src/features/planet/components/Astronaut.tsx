/**
 * "Little Astronaut" model by Jellever (Jelle Vermandere)
 * https://sketchfab.com/3d-models/12184db58b1f44c987537b5607c32098
 * License: CC-BY 4.0
 */
import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import vertexShader from '../shaders/silhouette.vert.glsl?raw'
import fragmentShader from '../shaders/astronaut.frag.glsl?raw'

// Green rim to reflect planet's atmospheric glow
const RIM_COLOR = new THREE.Vector3(0.24, 0.78, 0.16)

function useAstronautMaterial() {
  return useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uRimColor: { value: RIM_COLOR },
          uRimPower: { value: 2.5 },
          uRimIntensity: { value: 0.8 },
        },
        vertexShader,
        fragmentShader,
      }),
    []
  )
}

interface AstronautProps {
  position?: [number, number, number]
  scale?: number
}

export default function Astronaut({
  position = [0, 0, 0],
  scale = 0.15,
}: AstronautProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/Astronaut.glb')
  const material = useAstronautMaterial()
  const { pointer } = useThree()

  // Store base position in a ref so useFrame always has the latest value
  const basePos = useRef(position)
  basePos.current = position

  // Smooth mouse tracking values
  const smoothMouse = useRef({ x: 0, y: 0 })

  // Apply custom material to all meshes in the model
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material
      }
    })
  }, [scene, material])

  useFrame((_state, delta) => {
    if (!groupRef.current) return

    // Lerp toward current mouse position for smooth feel
    const lerpFactor = 1 - Math.pow(0.05, delta)
    smoothMouse.current.x += (pointer.x - smoothMouse.current.x) * lerpFactor
    smoothMouse.current.y += (pointer.y - smoothMouse.current.y) * lerpFactor

    const mx = smoothMouse.current.x
    const my = smoothMouse.current.y

    // Parallax tilt — subtle rotation toward cursor
    groupRef.current.rotation.y = mx * 0.15
    groupRef.current.rotation.x = -my * 0.1

    // Gentle drift — mouse position nudges the astronaut
    const bp = basePos.current
    groupRef.current.position.x = bp[0] + mx * 0.08
    groupRef.current.position.y = bp[1] + my * 0.05
    groupRef.current.position.z = bp[2]
  })

  return (
    <group ref={groupRef} scale={scale} dispose={null}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/Astronaut.glb')
