attribute float aSpeed;
attribute vec3 aDirection;

uniform float uTime;
uniform float uRedMode;

varying float vAlpha;

void main() {
  float t = mod(uTime * aSpeed, 1.0);
  vec3 pos = position + aDirection * t * 0.04;

  // Distance from planet center
  float dist = length(pos);
  // Visible in atmosphere band: fade in from surface, fade out past band
  float fadeIn = smoothstep(1.0, 1.01, dist);
  float fadeOut = 1.0 - smoothstep(1.02, 1.05, dist);
  float bandFade = fadeIn * fadeOut;

  // Fade over lifetime, confined to band
  vAlpha = sin(t * 3.14159) * 0.6 * bandFade;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = (0.6 - t * 0.3) * (80.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
