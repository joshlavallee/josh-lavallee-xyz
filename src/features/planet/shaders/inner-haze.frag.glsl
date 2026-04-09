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

  // Sun-aware
  float sunDot = max(dot(nPos, normalize(uSunDirection)), 0.0);
  float sunFactor = 0.3 + 0.7 * sunDot;

  // Very subtle inner haze — just a whisper near the limb
  float haze = pow(rim, 4.0) * 0.04;
  haze += pow(rim, 7.0) * 0.03;

  // Wispy noise
  float wisps = snoise(nPos * 6.0 + vec3(uTime * 0.01, 0.0, 0.0)) * 0.5 + 0.5;

  float alpha = haze * sunFactor;
  alpha *= 0.7 + 0.3 * wisps;

  vec3 col = vec3(0.05, 0.28, 0.07);

  gl_FragColor = vec4(col, alpha);
}
