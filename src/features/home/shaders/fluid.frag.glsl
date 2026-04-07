uniform float uColorMode;
uniform vec3 uThemeTint;

varying float vDisplacement;

vec3 displacementColor(float d) {
  // Normalize displacement to 0-1 range
  float t = clamp(d / 2.0, 0.0, 1.0);

  // Three-stop color ramp: cyan -> purple -> hot pink
  vec3 cyan = vec3(0.13, 0.88, 0.83);
  vec3 purple = vec3(0.55, 0.24, 0.78);
  vec3 hotPink = vec3(1.0, 0.2, 0.6);

  vec3 color;
  if (t < 0.5) {
    color = mix(cyan, purple, t / 0.5);
  } else {
    color = mix(purple, hotPink, (t - 0.5) / 0.5);
  }

  return color;
}

void main() {
  vec3 color = displacementColor(abs(vDisplacement));

  // Glow: brighter at higher displacement
  float glow = mix(0.4, 1.0, clamp(abs(vDisplacement) / 2.0, 0.0, 1.0));

  // Light mode: increase base brightness, slight desaturation
  float baseBrightness = mix(0.0, 0.2, uColorMode);
  glow = mix(glow, max(glow, 0.6), uColorMode);

  color *= glow;
  color += baseBrightness;

  // Theme tint
  color += uThemeTint * 0.15;

  gl_FragColor = vec4(color, 1.0);
}
