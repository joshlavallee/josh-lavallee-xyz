import { Sky } from '@react-three/drei'

export default function DayEnvironment() {
  return (
    <>
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        color="#FFF5E6"
        castShadow
      />
      <ambientLight intensity={0.4} color="#B0D4F1" />
      <hemisphereLight
        color="#87CEEB"
        groundColor="#4A8C3F"
        intensity={0.3}
      />
      <Sky
        sunPosition={[5, 10, 5]}
        turbidity={8}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
    </>
  )
}
