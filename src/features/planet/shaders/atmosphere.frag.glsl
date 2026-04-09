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

  // Sun-aware brightness: brighter on lit side
  float sunDot = max(dot(nPos, normalize(uSunDirection)), 0.0);
  float sunFactor = 0.4 + 0.6 * sunDot;

  // Noise-textured edge: break up the geometric perfection
  float noiseVal = snoise(nPos * 3.0 + vec3(uTime * 0.02)) * 0.5 + 0.5;
  float noiseDetail = snoise(nPos * 8.0 - vec3(uTime * 0.01)) * 0.5 + 0.5;
  float noiseMix = noiseVal * 0.7 + noiseDetail * 0.3;

  // Thick layered falloff
  float innerGlow = smoothstep(0.15, 0.85, rim) * 0.12;
  float midGlow = pow(rim, 2.0) * 0.25;
  float outerGlow = pow(rim, 4.0) * 0.45;
  float edgeGlow = pow(rim, 8.0) * 0.3;

  float alpha = (innerGlow + midGlow + outerGlow + edgeGlow) * sunFactor;

  // Noise modulates the alpha for textured feel
  alpha *= 0.7 + 0.3 * noiseMix;

  // Color: warm green on lit side, cooler teal on shadow
  vec3 litColor = vec3(0.12, 0.50, 0.08);
  vec3 shadowColor = vec3(0.04, 0.25, 0.12);
  vec3 brightEdge = vec3(0.18, 0.65, 0.12);

  vec3 baseColor = mix(shadowColor, litColor, sunDot);
  vec3 color = mix(baseColor, brightEdge, pow(rim, 3.0));

  gl_FragColor = vec4(color, alpha);
}
