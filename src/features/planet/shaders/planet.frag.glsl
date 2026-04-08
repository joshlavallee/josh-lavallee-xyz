uniform float uTime;
uniform float uSwirlIntensity;
uniform float uOrangeIntensity;
uniform vec3 uSunDirection;

varying vec3 vPosition;
varying vec3 vNormal;

//
// 3D Simplex Noise (Stefan Gustavson, adapted from Ashima Arts, MIT license)
//
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise3D(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  // Gradients: 7x7 points over a square, mapped onto an octahedron
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

//
// FBM (Fractal Brownian Motion)
//
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise3D(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }

  return value;
}

//
// Domain Warping
//
vec3 domainWarp(vec3 p, float strength, float time) {
  vec3 offset1 = vec3(1.7, 9.2, 3.4);
  vec3 offset2 = vec3(8.3, 2.8, 5.1);
  vec3 offset3 = vec3(4.6, 7.1, 1.9);

  vec3 warp = vec3(
    snoise3D(p + offset1 + time * 0.03),
    snoise3D(p + offset2 + time * 0.02),
    snoise3D(p + offset3 + time * 0.025)
  );

  return p + strength * warp;
}

//
// Color Ramp: greens with orange patches
//
vec3 colorRamp(float t, float orangeBias) {
  // Normalize t from roughly [-1, 1] to [0, 1]
  float n = clamp(t * 0.5 + 0.5, 0.0, 1.0);

  // Green stops
  vec3 deepGreen   = vec3(0.04, 0.16, 0.04);
  vec3 forestGreen  = vec3(0.10, 0.35, 0.10);
  vec3 midGreen     = vec3(0.29, 0.60, 0.17);
  vec3 limeGreen    = vec3(0.48, 0.80, 0.19);
  vec3 chartreuse   = vec3(0.78, 0.91, 0.25);

  // Orange stops
  vec3 amber  = vec3(0.80, 0.48, 0.13);
  vec3 orange = vec3(0.91, 0.63, 0.19);

  // Base green ramp (5 stops across 0-1)
  vec3 color;
  if (n < 0.25) {
    color = mix(deepGreen, forestGreen, n / 0.25);
  } else if (n < 0.5) {
    color = mix(forestGreen, midGreen, (n - 0.25) / 0.25);
  } else if (n < 0.75) {
    color = mix(midGreen, limeGreen, (n - 0.5) / 0.25);
  } else {
    color = mix(limeGreen, chartreuse, (n - 0.75) / 0.25);
  }

  // Blend in orange at the high end, controlled by orangeBias
  float orangeThreshold = 1.0 - orangeBias;
  float orangeMix = smoothstep(orangeThreshold - 0.15, orangeThreshold + 0.1, n);
  vec3 orangeColor = mix(amber, orange, smoothstep(orangeThreshold, 1.0, n));
  color = mix(color, orangeColor, orangeMix);

  return color;
}

void main() {
  vec3 p = vPosition * 1.5;

  // Domain warp for swirling turbulence
  vec3 warped = domainWarp(p, uSwirlIntensity, uTime);

  // Second layer of warp for extra turbulence
  warped = domainWarp(warped, uSwirlIntensity * 0.5, uTime * 0.7);

  // FBM noise on warped coordinates
  float n = fbm(warped, 6);

  // Color from noise
  vec3 color = colorRamp(n, uOrangeIntensity);

  // Diffuse lighting
  float diffuse = max(dot(vNormal, normalize(uSunDirection)), 0.0);
  float ambient = 0.08;
  float lighting = ambient + diffuse * 0.92;

  // Fresnel rim glow (atmospheric scattering)
  float fresnel = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
  fresnel = pow(fresnel, 3.0);
  vec3 rimColor = vec3(0.3, 0.8, 0.2) * fresnel * 0.6;

  color = color * lighting + rimColor;

  gl_FragColor = vec4(color, 1.0);
}
