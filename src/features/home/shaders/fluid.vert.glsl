uniform float uTime;
uniform vec2 uMouse;
uniform float uDisplacementScale;
uniform float uMouseRadius;
uniform float uMouseStrength;

varying float vDisplacement;

NOISE_PLACEHOLDER

void main() {
  vec3 pos = position;
  vec2 xz = pos.xy;

  // Multi-octave displacement
  float slowTime = uTime * 0.08;
  float medTime = uTime * 0.15;
  float fastTime = uTime * 0.2;

  float n1 = snoise(xz * 0.3 + vec2(slowTime, slowTime * 0.7)) * 0.8;
  float n2 = snoise(xz * 0.8 + vec2(-medTime * 0.5, medTime * 0.8)) * 0.4;
  float n3 = snoise(xz * 1.8 + vec2(fastTime * 0.3, -slowTime * 1.2)) * 0.15;

  float displacement = (n1 + n2 + n3) * uDisplacementScale;

  // Mouse influence with organic wave distortion
  float mouseDist = distance(xz, uMouse);
  float mouseInfluence = smoothstep(uMouseRadius, 0.0, mouseDist);

  // Layered mouse noise for wavy, organic feel
  float wave1 = snoise(xz * 1.5 + vec2(uTime * 0.4, -uTime * 0.25));
  float wave2 = snoise(xz * 2.8 + vec2(-uTime * 0.3, uTime * 0.35)) * 0.5;
  float mouseWave = wave1 + wave2;

  displacement += mouseInfluence * (uMouseStrength + mouseWave * 0.6);

  // Apply displacement along local Z (becomes world Y after rotation)
  pos.z += displacement;

  vDisplacement = displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
