uniform vec3 uSunDirection;
uniform float uTime;
uniform float uRedMode;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vPosition;

// noise3d.glsl will be prepended at import time

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  vec3 nPos = normalize(vPosition);
  float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);

  // Sun-aware brightness
  float sunDot = max(dot(nPos, normalize(uSunDirection)), 0.0);
  float sunFactor = 0.3 + 0.7 * sunDot;

  // Gradient falloff — soft inner, very gradual fade to space
  float glow = pow(rim, 5.0) * 0.04;
  float edge = pow(rim, 10.0) * 0.06;
  // Extra-soft outer gradient that bleeds gently into space
  float outerFade = pow(rim, 16.0) * 0.03;

  // Aurora-like waves along the limb
  float angle = atan(nPos.y, nPos.x);
  float wave1 = sin(angle * 3.0 + uTime * 0.3) * 0.5 + 0.5;
  float wave2 = sin(angle * 7.0 - uTime * 0.2 + 1.5) * 0.5 + 0.5;
  float wave3 = sin(angle * 12.0 + uTime * 0.15 + 3.0) * 0.5 + 0.5;
  float aurora = wave1 * 0.5 + wave2 * 0.3 + wave3 * 0.2;

  // Aurora only visible near the limb
  float auroraAlpha = pow(rim, 3.0) * aurora * 0.06;

  // Subtle noise texture
  float noise = snoise(nPos * 5.0 + vec3(uTime * 0.01)) * 0.5 + 0.5;

  float alpha = (glow + edge + outerFade + auroraAlpha) * sunFactor;
  alpha *= 0.8 + 0.2 * noise;

  // Color shifts between green and red based on mode
  vec3 greenBase = vec3(0.06, 0.30, 0.08);
  vec3 greenAurora = vec3(0.08, 0.45, 0.15);
  vec3 redBase = vec3(0.35, 0.06, 0.03);
  vec3 redAurora = vec3(0.50, 0.10, 0.05);

  vec3 base = mix(greenBase, redBase, uRedMode);
  vec3 auroraCol = mix(greenAurora, redAurora, uRedMode);
  vec3 color = mix(base, auroraCol, aurora * pow(rim, 2.0));

  gl_FragColor = vec4(color, alpha);
}
