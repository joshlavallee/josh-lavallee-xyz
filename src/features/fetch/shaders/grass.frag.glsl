uniform vec3 uBaseColor;
uniform vec3 uTipColor;
uniform vec3 uFlowerColorA;
uniform vec3 uFlowerColorB;
uniform vec3 uFogColor;
uniform vec3 uFogColorNight;
uniform float uNightBlend;
uniform float uGlowIntensity;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uLightIntensity;

varying float vElevation;
varying float vSideGradient;
varying vec3 vNormal;
varying vec3 vFakeNormal;
varying vec3 vPosition;
varying float vBladeType;
varying float vBladeRand;

vec3 directionalLight(vec3 lightColor, float intensity, vec3 normal, vec3 lightDir, vec3 viewDir, float specPower) {
  vec3 ld = normalize(lightDir);
  float shading = max(0.0, dot(normal, ld));
  vec3 refl = reflect(-ld, normal);
  float spec = pow(max(0.0, -dot(refl, viewDir)), specPower) * shading;
  return lightColor * intensity * (shading + spec);
}

void main() {
  float gradient = smoothstep(0.2, 1.0, vElevation);
  float sideGradient = smoothstep(0.2, 1.0, vSideGradient);

  // Base grass color
  vec3 dayColor = mix(uBaseColor, uTipColor, gradient);

  // Night shift: darken and add blue tint
  vec3 nightTint = vec3(0.1, 0.15, 0.3);
  vec3 nightColor = mix(dayColor * 0.4, nightTint, 0.3);
  vec3 baseColor = mix(dayColor, nightColor, uNightBlend);

  // Flower override
  if (vBladeType >= 2.0) {
    vec3 flowerColor = vBladeType < 3.0 ? uFlowerColorA : uFlowerColorB;
    float petalGradient = smoothstep(0.3, 0.8, vElevation);
    baseColor = mix(baseColor, flowerColor, petalGradient);

    // Bioluminescent glow at night
    float glow = uNightBlend * uGlowIntensity * petalGradient;
    baseColor += flowerColor * glow * 0.5;
  }

  // Lighting
  vec3 normal = gl_FrontFacing ? vFakeNormal : -vFakeNormal;
  vec3 viewDir = normalize(cameraPosition - vPosition);
  vec3 light = vec3(0.0);
  float ambientIntensity = mix(0.5, 0.25, uNightBlend);
  light += vec3(1.0) * ambientIntensity;
  light += directionalLight(uLightColor, uLightIntensity, normal, uLightDirection, viewDir, 64.0);

  vec3 finalColor = baseColor * light;

  // Per-blade color jitter
  finalColor *= mix(0.9, 1.1, vBladeRand);

  // Distance fog
  float dist = length(cameraPosition - vPosition);
  float fogFactor = smoothstep(8.0, 30.0, dist);
  vec3 fogColor = mix(uFogColor, uFogColorNight, uNightBlend);
  finalColor = mix(finalColor, fogColor, fogFactor);

  gl_FragColor = vec4(finalColor, 1.0);
}
