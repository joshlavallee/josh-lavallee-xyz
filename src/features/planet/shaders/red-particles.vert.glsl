attribute float aSpeed;
attribute vec3 aDirection;
attribute float aSize;

uniform float uTime;
uniform float uRedMode;

varying float vAlpha;
varying float vSparkle;

// Simple hash for per-particle randomness
float hash(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  float t = mod(uTime * aSpeed, 1.0);
  vec3 pos = position + aDirection * t * 0.03;

  // Fade based on red mode — invisible when off
  float lifeFade = sin(t * 3.14159);
  vAlpha = lifeFade * 0.5 * uRedMode;

  // Per-particle sparkle: use vertex index hash with time for shimmer
  float id = position.x * 127.1 + position.y * 311.7 + position.z * 74.7;
  float sparklePhase = hash(id) * 6.283;
  float sparkleSpeed = 2.0 + hash(id * 1.3) * 4.0;
  vSparkle = pow(max(sin(uTime * sparkleSpeed + sparklePhase), 0.0), 8.0) * step(0.7, hash(id * 2.1));

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * (60.0 / -mvPosition.z) * uRedMode;
  gl_Position = projectionMatrix * mvPosition;
}
