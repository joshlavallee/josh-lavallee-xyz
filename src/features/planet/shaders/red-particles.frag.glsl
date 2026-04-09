varying float vAlpha;
varying float vSparkle;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float soft = 1.0 - smoothstep(0.15, 0.5, dist);

  vec3 redColor = vec3(0.7, 0.12, 0.05);
  vec3 whiteColor = vec3(0.95, 0.5, 0.35);
  vec3 color = mix(redColor, whiteColor, vSparkle);
  float alpha = soft * vAlpha * (1.0 + vSparkle * 2.0);
  gl_FragColor = vec4(color, alpha);
}
