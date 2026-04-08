import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import TouchTexture from '../lib/TouchTexture'

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
      // Convert screen coordinates to normalized 0-1 space matching the particle grid
      const rect = domElement.getBoundingClientRect()
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1

      // For orthographic camera, NDC maps directly to world space
      // The particle grid spans from -imageAspect/2 to +imageAspect/2 on X
      // and -0.5 to +0.5 on Y
      // Map NDC to the particle grid's UV space (0-1)
      const cam = camera as THREE.OrthographicCamera
      const viewWidth = (cam.right - cam.left)
      const viewHeight = (cam.top - cam.bottom)
      const worldX = ndcX * viewWidth / 2
      const worldY = ndcY * viewHeight / 2

      const uvX = (worldX / (imageAspect * 0.5)) * 0.5 + 0.5
      const uvY = worldY + 0.5

      if (uvX >= 0 && uvX <= 1 && uvY >= 0 && uvY <= 1) {
        touchTexture.addTouch(uvX, uvY)
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
