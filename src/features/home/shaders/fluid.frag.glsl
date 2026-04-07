uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uColorMode;
uniform vec3 uThemeTint;

varying vec2 vUv;

NOISE_PLACEHOLDER

// Map a noise value (roughly -1..1) to a 5-stop retrowave gradient
vec3 retroGradient(float t, float brightness) {
  // Remap to 0..1
  t = t * 0.5 + 0.5;

  // 5 color stops: deep purple, neon pink, dark blue, cyan, purple
  vec3 c0 = vec3(0.15, 0.05, 0.30);  // deep purple
  vec3 c1 = vec3(0.70, 0.15, 0.50);  // neon pink
  vec3 c2 = vec3(0.08, 0.08, 0.25);  // dark blue
  vec3 c3 = vec3(0.20, 0.70, 0.75);  // cyan
  vec3 c4 = vec3(0.40, 0.10, 0.55);  // mid purple

  vec3 color;
  if (t < 0.25) {
    color = mix(c0, c1, t / 0.25);
  } else if (t < 0.5) {
    color = mix(c1, c2, (t - 0.25) / 0.25);
  } else if (t < 0.75) {
    color = mix(c2, c3, (t - 0.5) / 0.25);
  } else {
    color = mix(c3, c4, (t - 0.75) / 0.25);
  }

  // Apply brightness for light/dark mode
  color = mix(color, color * 1.6 + 0.15, brightness);

  return color;
}

void main() {
  // Aspect-corrected UV
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 uvAspect = vec2(uv.x * aspect, uv.y);

  // Cursor distance for ripple effect
  vec2 mouseAspect = vec2(uMouse.x * aspect, uMouse.y);
  float cursorDist = distance(uvAspect, mouseAspect);
  float cursorInfluence = smoothstep(0.3, 0.0, cursorDist);

  // Time-varying offsets
  float slowTime = uTime * 0.08;
  float medTime = uTime * 0.15;

  // Multi-octave noise for fluid movement
  float n1 = snoise(uvAspect * 2.0 + vec2(slowTime, slowTime * 0.7));
  float n2 = snoise(uvAspect * 4.0 + vec2(-medTime * 0.5, medTime * 0.8)) * 0.5;
  float n3 = snoise(uvAspect * 8.0 + vec2(medTime * 0.3, -slowTime * 1.2)) * 0.25;

  // Combine octaves
  float noise = n1 + n2 + n3;

  // Cursor creates subtle frequency boost and color shift
  float cursorNoise = snoise(uvAspect * 6.0 + vec2(uTime * 0.2, -uTime * 0.15));
  noise += cursorInfluence * cursorNoise * 0.4;

  // Map noise to retrowave gradient
  vec3 color = retroGradient(noise, uColorMode);

  // Apply theme tint
  color += uThemeTint * 0.15;

  // Subtle vignette
  float vignette = 1.0 - smoothstep(0.4, 1.4, length(uv - 0.5) * 2.0);
  color *= mix(0.7, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
