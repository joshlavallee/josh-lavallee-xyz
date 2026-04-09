import { Stars } from '@react-three/drei'

export default function NightEnvironment() {
  return (
    <>
      <directionalLight
        position={[-3, 8, -3]}
        intensity={0.6}
        color="#CCE5FF"
      />
      <ambientLight intensity={0.15} color="#1A1A3A" />
      <Stars
        radius={50}
        depth={50}
        count={2000}
        factor={4}
        fade
        speed={0.5}
      />
      {/* Moon */}
      <mesh position={[-15, 25, -20]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#F5F5DC" />
      </mesh>
    </>
  )
}
