uniform vec3 uRimColor;
uniform float uRimPower;
uniform float uRimIntensity;

varying vec3 vNormal;
varying vec3 vEyePos;

void main() {
  vec3 eyeDir = normalize(-vEyePos);

  // Fresnel rim: bright at edges, dark at face-on
  float fresnel = 1.0 - max(dot(vNormal, eyeDir), 0.0);
  float rim = pow(fresnel, uRimPower) * uRimIntensity;

  // Near-black base with green rim glow
  vec3 baseColor = vec3(0.02, 0.02, 0.02);
  vec3 color = baseColor + uRimColor * rim;

  gl_FragColor = vec4(color, 1.0);
}
