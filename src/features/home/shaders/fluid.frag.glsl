uniform float uColorMode;
uniform vec3 uThemeTint;
uniform vec3 uColorLow;
uniform vec3 uColorMid;
uniform vec3 uColorHigh;

varying float vDisplacement;

void main() {
  // Normalize displacement to 0-1 range
  float t = clamp(abs(vDisplacement) / 2.5, 0.0, 1.0);

  // Three-stop color ramp
  vec3 color;
  if (t < 0.5) {
    color = mix(uColorLow, uColorMid, t / 0.5);
  } else {
    color = mix(uColorMid, uColorHigh, (t - 0.5) / 0.5);
  }

  // Glow: brighter at higher displacement
  float glow = mix(0.35, 1.0, t);

  // Light mode: increase base brightness
  float baseBrightness = mix(0.0, 0.15, uColorMode);
  glow = mix(glow, max(glow, 0.55), uColorMode);

  color *= glow;
  color += baseBrightness;

  // Theme tint
  color += uThemeTint * 0.15;

  gl_FragColor = vec4(color, 1.0);
}
