uniform float uRedMode;

varying float vAlpha;

void main() {
  // Soft circular particle
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float soft = 1.0 - smoothstep(0.2, 0.5, dist);

  vec3 greenCol = vec3(0.15, 0.55, 0.12);
  vec3 redCol = vec3(0.55, 0.10, 0.04);
  vec3 color = mix(greenCol, redCol, uRedMode);
  gl_FragColor = vec4(color, soft * vAlpha);
}
