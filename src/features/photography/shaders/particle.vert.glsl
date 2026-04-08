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

  // Map particle position to touch texture UV space
  vec2 touchUV = vec2(
    (pos.x / (uImageAspect * 0.5)) * 0.5 + 0.5,
    pos.y + 0.5
  );
  float touchIntensity = texture2D(uTouchTexture, touchUV).r;

  // Scatter particles in XYZ
  float angle = aRandom * 6.28318;
  float zAngle = aRandom * 3.14159;
  float scatterDist = touchIntensity * uDisplacementScale * 0.03;
  pos.x += cos(angle) * scatterDist;
  pos.y += sin(angle) * scatterDist;
  pos.z += cos(zAngle) * scatterDist * 0.5;

  // Idle drift: floaty, suspended-in-liquid feel
  float noiseX = snoise(vec2(aRandom * 50.0, uTime * 0.1));
  float noiseY = snoise(vec2(aRandom * 50.0 + 100.0, uTime * 0.1));
  float noiseZ = snoise(vec2(aRandom * 50.0 + 200.0, uTime * 0.1));
  pos.x += noiseX * 0.012;
  pos.y += noiseY * 0.012;
  pos.z += noiseZ * 0.008;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

  // Perspective point size attenuation
  gl_PointSize = aSize * uPointSize * (300.0 / -mvPosition.z);

  gl_Position = projectionMatrix * mvPosition;

  // Slight fade on scattered particles
  vAlpha = 1.0 - smoothstep(0.0, 0.06, scatterDist);
}
