import type { SceneProps } from '@/features/photography/types'
import useInput from '../hooks/useInput'
import SphereWorld from './SphereWorld'

export default function FetchScene({ colorMode }: SceneProps) {
  const input = useInput()

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />

      <SphereWorld input={input} />
    </>
  )
}
