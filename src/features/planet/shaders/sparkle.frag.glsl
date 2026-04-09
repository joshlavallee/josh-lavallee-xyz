varying float vAlpha;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;

  // Tight bright core with soft glow
  float core = 1.0 - smoothstep(0.0, 0.15, dist);
  float glow = 1.0 - smoothstep(0.1, 0.5, dist);
  float shape = core * 0.7 + glow * 0.3;

  vec3 color = vec3(0.9, 0.35, 0.2);
  gl_FragColor = vec4(color, shape * vAlpha);
}
