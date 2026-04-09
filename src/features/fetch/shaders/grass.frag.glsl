uniform float u_nightBlend;

varying vec3 vColor;
varying float vHeight;

void main() {
  float brightness = 0.6 + vHeight * 0.4;

  vec3 dayColor = vColor * brightness;

  vec3 nightTint = vec3(0.1, 0.15, 0.3);
  vec3 nightColor = vColor * brightness * 0.3 + nightTint * 0.2;

  vec3 finalColor = mix(dayColor, nightColor, u_nightBlend);

  gl_FragColor = vec4(finalColor, 1.0);
}
