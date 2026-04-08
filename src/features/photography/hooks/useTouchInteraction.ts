import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import TouchTexture from '../lib/TouchTexture'

const raycaster = new THREE.Raycaster()
const ndcVec = new THREE.Vector2()
const hitPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
const intersectPoint = new THREE.Vector3()

export default function useTouchInteraction(imageAspect: number) {
  const touchTextureRef = useRef<TouchTexture | null>(null)
  const { gl, camera, size } = useThree()

  if (!touchTextureRef.current) {
    touchTextureRef.current = new TouchTexture()
  }

  useEffect(() => {
    const domElement = gl.domElement
    const touchTexture = touchTextureRef.current!

    function handlePointerMove(e: PointerEvent) {
      const rect = domElement.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1

      // Raycast against a plane at Z=0 facing the camera
      ndcVec.set(ndcX, ndcY)
      raycaster.setFromCamera(ndcVec, camera)
      const hit = raycaster.ray.intersectPlane(hitPlane, intersectPoint)

      if (hit) {
        // Map world XY to particle grid UV space (0-1)
        const uvX = (intersectPoint.x / (imageAspect * 0.5)) * 0.5 + 0.5
        const uvY = intersectPoint.y + 0.5

        if (uvX >= 0 && uvX <= 1 && uvY >= 0 && uvY <= 1) {
          touchTexture.addTouch(uvX, uvY)
        }
      }
    }

    domElement.addEventListener('pointermove', handlePointerMove)

    return () => {
      domElement.removeEventListener('pointermove', handlePointerMove)
    }
  }, [gl, camera, imageAspect, size])

  useFrame(() => {
    touchTextureRef.current?.update()
  })

  return touchTextureRef.current!.texture
}
