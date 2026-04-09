uniform vec3 uSunDirection;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vPosition;

// noise3d.glsl will be prepended at import time

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 nPos = normalize(vPosition);
  float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);

  // Sun-aware: haze more visible on lit side
  float sunDot = max(dot(nPos, normalize(uSunDirection)), 0.0);
  float sunFactor = 0.3 + 0.7 * sunDot;

  // Noise wisps
  float wisps = snoise(nPos * 4.0 + vec3(uTime * 0.015, 0.0, 0.0)) * 0.5 + 0.5;
  float detail = snoise(nPos * 10.0 + vec3(0.0, uTime * 0.008, 0.0)) * 0.5 + 0.5;
  float noiseVal = wisps * 0.6 + detail * 0.4;

  // Thicker haze that extends further across the planet face
  float haze = smoothstep(0.25, 0.9, rim) * 0.10;
  haze += pow(rim, 2.5) * 0.18;
  haze += pow(rim, 5.0) * 0.12;

  float alpha = haze * sunFactor;
  alpha *= 0.6 + 0.4 * noiseVal;

  vec3 col = vec3(0.08, 0.35, 0.09);

  gl_FragColor = vec4(col, alpha);
}
