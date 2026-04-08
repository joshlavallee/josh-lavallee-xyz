uniform float uTime;
uniform sampler2D uTouchTexture;
uniform float uPointSize;
uniform float uImageAspect;
uniform float uDisplacementScale;

attribute float aSize;
attribute float aRandom;

varying vec3 vColor;
varying float vAlpha;

NOISE_PLACEHOLDER

void main() {
  vColor = color;

  vec3 pos = position;

  // Point size in pixels (orthographic camera, no perspective scaling)
  gl_PointSize = aSize * uPointSize;

  // Map particle position to touch texture UV space
  vec2 touchUV = vec2(
    (pos.x / (uImageAspect * 0.5)) * 0.5 + 0.5,
    pos.y + 0.5
  );
  float touchIntensity = texture2D(uTouchTexture, touchUV).r;

  // Scatter particles in XY (Z is invisible with orthographic camera)
  float angle = aRandom * 6.28318;
  float scatterDist = touchIntensity * uDisplacementScale * 0.03;
  pos.x += cos(angle) * scatterDist;
  pos.y += sin(angle) * scatterDist;

  // Idle noise animation in XY
  float noiseX = snoise(vec2(aRandom * 50.0, uTime * 0.15));
  float noiseY = snoise(vec2(aRandom * 50.0 + 100.0, uTime * 0.15));
  pos.x += noiseX * 0.002;
  pos.y += noiseY * 0.002;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Slight fade on scattered particles
  vAlpha = 1.0 - smoothstep(0.0, 0.06, scatterDist);
}
