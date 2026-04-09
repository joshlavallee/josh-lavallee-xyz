uniform vec3 uSunDirection;
uniform float uEmissionStrength;

varying vec3 vNormal;
varying vec3 vEyePos;

void main() {
  vec3 eyeViewDir = normalize(vEyePos);

  // Fresnel: strongest at edges (grazing angles), zero at face-on
  float fresnel = 1.0 - max(dot(vNormal, -eyeViewDir), 0.0);

  // Steep falloff: only visible very close to the rim, fades softly to nothing
  float glow = pow(fresnel, 5.0);

  // Very faint wide haze underneath
  float haze = pow(fresnel, 3.0) * 0.15;

  float alpha = glow + haze;

  // Subtle lighting influence: brighter on the sunlit side
  vec3 sunDir = normalize(uSunDirection);
  float sunInfluence = max(dot(vNormal, sunDir) * 0.3 + 0.7, 0.0);

  // Atmosphere color: soft yellow-green
  vec3 glowColor = vec3(0.25, 0.80, 0.10) * sunInfluence;

  // Emission makes it visible even on shadow side
  float emission = uEmissionStrength * 0.12;
  glowColor *= (0.4 + emission);

  gl_FragColor = vec4(glowColor, alpha * 0.4);
}
