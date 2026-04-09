varying float vAlpha;

void main() {
  // Soft circular particle
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float soft = 1.0 - smoothstep(0.2, 0.5, dist);

  vec3 color = vec3(0.15, 0.55, 0.12);
  gl_FragColor = vec4(color, soft * vAlpha);
}
