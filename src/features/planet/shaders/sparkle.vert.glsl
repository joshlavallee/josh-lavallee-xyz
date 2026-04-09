attribute float aSpeed;
attribute vec3 aDirection;
attribute float aSize;
attribute float aPhase;

uniform float uTime;
uniform float uRedMode;

varying float vAlpha;

void main() {
  float t = mod(uTime * aSpeed, 1.0);
  vec3 pos = position + aDirection * t * 0.02;

  // Twinkle: gentle shimmer
  float twinkle = pow(max(sin(uTime * (1.5 + aSpeed * 2.5) + aPhase), 0.0), 6.0);
  float lifeFade = sin(t * 3.14159);
  vAlpha = lifeFade * twinkle * 0.9 * uRedMode;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * (50.0 / -mvPosition.z) * uRedMode * (0.5 + twinkle * 0.5);
  gl_Position = projectionMatrix * mvPosition;
}
