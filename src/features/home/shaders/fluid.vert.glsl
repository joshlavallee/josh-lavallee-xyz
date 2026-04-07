uniform float uTime;
uniform vec2 uMouse;

varying float vDisplacement;

NOISE_PLACEHOLDER

void main() {
  // World-space XZ for noise sampling
  vec3 pos = position;
  vec2 xz = pos.xy; // PlaneGeometry in XZ after mesh rotation: x stays x, y becomes z

  // Multi-octave displacement
  float slowTime = uTime * 0.08;
  float medTime = uTime * 0.15;
  float fastTime = uTime * 0.2;

  float n1 = snoise(xz * 0.4 + vec2(slowTime, slowTime * 0.7)) * 0.8;
  float n2 = snoise(xz * 1.0 + vec2(-medTime * 0.5, medTime * 0.8)) * 0.3;
  float n3 = snoise(xz * 2.5 + vec2(fastTime * 0.3, -slowTime * 1.2)) * 0.1;

  float displacement = n1 + n2 + n3;

  // Mouse influence: push/pull surface
  // uMouse is in world XZ; pos.xy maps to world XZ after rotation
  float mouseDist = distance(xz, uMouse);
  float mouseInfluence = smoothstep(1.5, 0.0, mouseDist);

  // Add mouse displacement with organic ripple
  float mouseNoise = snoise(xz * 3.0 + vec2(uTime * 0.3, -uTime * 0.2));
  displacement += mouseInfluence * (1.2 + mouseNoise * 0.3);

  // Apply displacement along normal (Z in local space, becomes Y after rotation)
  pos.z += displacement;

  vDisplacement = displacement;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
