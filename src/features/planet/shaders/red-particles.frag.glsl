varying float vAlpha;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float soft = 1.0 - smoothstep(0.15, 0.5, dist);

  vec3 color = vec3(0.7, 0.12, 0.05);
  gl_FragColor = vec4(color, soft * vAlpha);
}
