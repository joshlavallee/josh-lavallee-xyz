uniform float uTime;
uniform float uRedMode;

varying vec3 vDirection;

// ─── Hash functions for procedural star placement ───

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}

// ─── Value noise for nebula tinting ───

float vnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), f.x),
        mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), f.x),
        mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.0 + vec3(1.7, 9.2, 3.4);
    a *= 0.5;
  }
  return v;
}

// ─── Procedural starfield (3 density layers) ───

vec3 stars(vec3 p) {
  vec3 c = vec3(0.0);
  float res = 350.0;

  for (float i = 0.0; i < 3.0; i++) {
    float scale = 0.15 * res;
    vec3 q = fract(p * scale) - 0.5;
    vec3 id = floor(p * scale);

    float rand1 = hash13(id);
    float rand2 = hash13(id + 137.0);
    float rand3 = hash13(id + 271.0);

    // Star exists if random value below threshold (~1% of cells)
    float starMask = step(rand1, 0.008 + i * 0.002);

    // Point brightness: sharp falloff from cell center
    float brightness = 1.0 - smoothstep(0.0, 0.4 + rand3 * 0.2, length(q));
    brightness *= starMask;

    // Twinkle
    brightness *= 0.8 + 0.2 * sin(uTime * (1.0 + rand3 * 3.0) + rand2 * 6.28);

    // Star color: shifts to reds in red mode
    vec3 warmStar = mix(vec3(1.0, 0.5, 0.15), vec3(1.0, 0.2, 0.08), uRedMode);
    vec3 coolStar = mix(vec3(0.7, 0.85, 1.0), vec3(0.9, 0.15, 0.05), uRedMode);
    vec3 starColor = mix(warmStar, coolStar, rand2) * 0.3 + 1.0;

    c += brightness * starColor;
    p *= 1.8;
  }
  return c * c * 0.4;
}

// ─── Main ───

void main() {
  vec3 dir = normalize(vDirection);

  // Slow background rotation for parallax
  float angle = uTime * 0.00008;
  float ca = cos(angle), sa = sin(angle);
  dir = vec3(dir.x * ca - dir.z * sa, dir.y, dir.x * sa + dir.z * ca);

  // Stars
  vec3 color = stars(dir);

  // Subtle nebula: very faint colored regions
  float nebula = fbm(dir * 2.5);
  vec3 nebulaColor = mix(vec3(0.0, 0.0, 0.003), vec3(0.015, 0.04, 0.008), nebula);
  color += nebulaColor;

  gl_FragColor = vec4(color, 1.0);
}
