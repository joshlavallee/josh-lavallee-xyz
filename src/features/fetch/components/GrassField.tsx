import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import grassVertexShader from '../shaders/grass.vert.glsl?raw'
import grassFragmentShader from '../shaders/grass.frag.glsl?raw'
import { SPHERE_RADIUS } from '../constants'

const BLADE_COUNT = 15000
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

interface GrassFieldProps {
  dogPositionRef: React.RefObject<THREE.Vector3>
  nightBlend: number
}

function createBladeGeometry(): THREE.BufferGeometry {
  const positions = new Float32Array([
    -0.015, 0, 0,
     0.015, 0, 0,
    -0.008, 0.5, 0,
     0.008, 0.5, 0,
     0.0, 1.0, 0,
  ])
  const indices = [0, 1, 2, 2, 1, 3, 2, 3, 4]
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export default function GrassField({ dogPositionRef, nightBlend }: GrassFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const { geometry, matricesArray } = useMemo(() => {
    const geo = createBladeGeometry()
    const colors = new Float32Array(BLADE_COUNT * 3)
    const heights = new Float32Array(BLADE_COUNT)
    const leans = new Float32Array(BLADE_COUNT)
    const offsets = new Float32Array(BLADE_COUNT * 3)
    const matrices = new Float32Array(BLADE_COUNT * 16)
    const dummy = new THREE.Object3D()
    const normal = new THREE.Vector3()

    for (let i = 0; i < BLADE_COUNT; i++) {
      const y = 1 - (i / (BLADE_COUNT - 1)) * 1.0
      const radiusFactor = Math.sqrt(1 - y * y)
      const angle = GOLDEN_ANGLE * i

      const px = radiusFactor * Math.cos(angle) * SPHERE_RADIUS
      const py = y * SPHERE_RADIUS
      const pz = radiusFactor * Math.sin(angle) * SPHERE_RADIUS

      normal.set(px, py, pz).normalize()

      dummy.position.set(px, py, pz)
      dummy.up.set(0, 1, 0)
      dummy.lookAt(px + normal.x, py + normal.y, pz + normal.z)
      dummy.rotateX(Math.PI / 2)
      dummy.rotateZ(Math.random() * Math.PI * 2)

      dummy.updateMatrix()
      dummy.matrix.toArray(matrices, i * 16)

      heights[i] = 0.3 + Math.random() * 0.5
      leans[i] = Math.random() * Math.PI * 2

      offsets[i * 3] = px
      offsets[i * 3 + 1] = py
      offsets[i * 3 + 2] = pz

      const hue = 90 + Math.random() * 50
      const sat = 0.4 + Math.random() * 0.3
      const light = 0.25 + Math.random() * 0.2
      const color = new THREE.Color().setHSL(hue / 360, sat, light)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geo.setAttribute('instanceColor', new THREE.InstancedBufferAttribute(colors, 3))
    geo.setAttribute('instanceHeight', new THREE.InstancedBufferAttribute(heights, 1))
    geo.setAttribute('instanceLean', new THREE.InstancedBufferAttribute(leans, 1))
    geo.setAttribute('instanceOffset', new THREE.InstancedBufferAttribute(offsets, 3))

    return { geometry: geo, matricesArray: matrices }
  }, [])

  useFrame(({ clock }) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.u_time.value = clock.getElapsedTime()
    materialRef.current.uniforms.u_nightBlend.value = nightBlend

    if (dogPositionRef.current) {
      materialRef.current.uniforms.u_dogPosition.value.copy(dogPositionRef.current)
    }
  })

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_dogPosition: { value: new THREE.Vector3() },
      u_nightBlend: { value: 0 },
    }),
    [],
  )

  return (
    <instancedMesh
      ref={(mesh) => {
        if (mesh && meshRef.current !== mesh) {
          meshRef.current = mesh
          for (let i = 0; i < BLADE_COUNT; i++) {
            const m = new THREE.Matrix4()
            m.fromArray(matricesArray, i * 16)
            mesh.setMatrixAt(i, m)
          }
          mesh.instanceMatrix.needsUpdate = true
        }
      }}
      args={[undefined, undefined, BLADE_COUNT]}
      frustumCulled={false}
    >
      <bufferGeometry attach="geometry" {...geometry} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={grassVertexShader}
        fragmentShader={grassFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  )
}
