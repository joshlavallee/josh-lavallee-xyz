uniform vec3 uSunDirection;
uniform float uEmissionStrength;

varying vec3 vNormal;
varying vec3 vEyePos;

void main() {
  vec3 eyeViewDir = normalize(vEyePos);
  vec3 normal = normalize(vNormal);

  // Fresnel: strongest at edges, zero face-on
  float fresnel = 1.0 - max(dot(normal, -eyeViewDir), 0.0);

  // Thin bright glow at the very rim
  float glow = pow(fresnel, 5.0) * 0.8;

  // Subtle lighting: brighter on sunlit side
  vec3 sunDir = normalize(uSunDirection);
  float sunInfluence = max(dot(normal, sunDir) * 0.3 + 0.7, 0.0);

  vec3 glowColor = vec3(0.35, 1.0, 0.15) * sunInfluence;
  float emission = uEmissionStrength * 0.08;
  glowColor *= (0.3 + emission);

  // Discard face-on fragments entirely to avoid any flat color
  if (glow < 0.01) discard;

  gl_FragColor = vec4(glowColor, glow);
}
