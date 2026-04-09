attribute float aSpeed;
attribute vec3 aDirection;
attribute float aSize;

uniform float uTime;
uniform float uRedMode;

varying float vAlpha;

void main() {
  float t = mod(uTime * aSpeed, 1.0);
  vec3 pos = position + aDirection * t * 0.03;

  // Fade based on red mode — invisible when off
  float lifeFade = sin(t * 3.14159);
  vAlpha = lifeFade * 0.5 * uRedMode;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = aSize * (60.0 / -mvPosition.z) * uRedMode;
  gl_Position = projectionMatrix * mvPosition;
}
