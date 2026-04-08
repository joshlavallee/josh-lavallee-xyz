uniform float uTime;
uniform float uSwirlIntensity;
uniform float uOrangeIntensity;
uniform vec3 uSunDirection;

varying vec3 vPosition;
varying vec3 vNormal;

// ─── 3D Simplex Noise (Gustavson / Ashima Arts, MIT) ───

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise3D(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

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

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ─── Rotation matrix for vortex shedding per FBM octave ───

mat3 rotationMatrix = mat3(
   0.00,  0.80,  0.60,
  -0.80,  0.36, -0.48,
  -0.60, -0.48,  0.64
);

// ─── FBM with rotation per octave (vortex shedding) ───

float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 6; i++) {
    value += amplitude * snoise3D(p);
    p = rotationMatrix * p * 2.0 + vec3(1.7, 9.2, 3.4);
    amplitude *= 0.5;
  }

  return value;
}

// ─── Nested Domain Warping (q/r pattern, Inigo Quilez style) ───

float warpedNoise(vec3 p, float warpStrength, float time) {
  // First warp layer: q
  vec3 q = vec3(
    fbm(p + vec3(0.0, 0.0, 0.0) + time * 0.02),
    fbm(p + vec3(5.2, 1.3, 2.8) + time * 0.015),
    fbm(p + vec3(1.7, 9.2, 4.6) + time * 0.018)
  );

  // Second warp layer: r (warped by q)
  vec3 r = vec3(
    fbm(p + warpStrength * q + vec3(1.7, 9.2, 0.0) + time * 0.008),
    fbm(p + warpStrength * q + vec3(8.3, 2.8, 3.1) + time * 0.012),
    fbm(p + warpStrength * q + vec3(2.1, 6.3, 7.4) + time * 0.01)
  );

  // Final noise from double-warped coordinates
  return fbm(p + warpStrength * r);
}

// ─── Color palette: vibrant Tau Ceti atmosphere ───
// Sampled from reference: neon yellow-greens dominate, darks are still rich green,
// with small concentrated amber/orange patches

vec3 atmosphereColor(float t, float amberBias) {
  float n = clamp(t * 0.5 + 0.5, 0.0, 1.0);

  // Darks: rich deep green (NOT brown, NOT olive)
  vec3 deepGreen    = vec3(0.02, 0.10, 0.02);
  vec3 darkGreen    = vec3(0.06, 0.22, 0.03);

  // Mids: vivid green
  vec3 brightGreen  = vec3(0.18, 0.55, 0.05);

  // Highlights: neon yellow-green, practically glowing
  vec3 chartreuse   = vec3(0.55, 0.85, 0.05);
  vec3 neonLime     = vec3(0.75, 1.0, 0.0);    // #bfff00

  // Amber/orange for concentrated hot patches
  vec3 amber        = vec3(0.85, 0.55, 0.05);
  vec3 hotOrange    = vec3(0.95, 0.65, 0.08);

  // Ramp: most of the surface is green, highlights are neon
  float s1 = smoothstep(0.0, 0.2, n);
  float s2 = smoothstep(0.1, 0.4, n);
  float s3 = smoothstep(0.3, 0.6, n);
  float s4 = smoothstep(0.5, 0.8, n);

  vec3 color = deepGreen;
  color = mix(color, darkGreen, s1);
  color = mix(color, brightGreen, s2);
  color = mix(color, chartreuse, s3);
  color = mix(color, neonLime, s4);

  // Amber patches: only at the very highest peaks, small and concentrated
  float amberThreshold = 1.0 - amberBias * 0.4;
  float amberMix = smoothstep(amberThreshold - 0.05, amberThreshold + 0.05, n);
  vec3 amberColor = mix(amber, hotOrange, smoothstep(amberThreshold, 1.0, n));
  color = mix(color, amberColor, amberMix);

  return color;
}

void main() {
  vec3 p = vPosition * 1.6;

  // Sluggish, heavy time for massive dense atmosphere
  float slowTime = uTime * 0.02;

  // Nested domain warping: the q/r curdling effect
  float n = warpedNoise(p, uSwirlIntensity, slowTime);

  // Mild contrast to separate swirls from depths (not crushing shadows)
  float nNorm = clamp(n * 0.5 + 0.5, 0.0, 1.0);
  nNorm = pow(nNorm, 1.3);
  n = nNorm * 2.0 - 1.0;

  // Color from warped noise
  vec3 color = atmosphereColor(n, uOrangeIntensity);

  // Subtle depth variation (not aggressive darkening)
  color *= 0.75 + nNorm * 0.35;

  // Diffuse lighting: brighter ambient so dark side stays green, not black
  float diffuse = max(dot(vNormal, normalize(uSunDirection)), 0.0);
  float ambient = 0.25;
  float lighting = ambient + diffuse * 0.75;
  color *= lighting;

  // Fresnel rim: dark green → neon lime glow at the planet edge
  float fresnel = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
  fresnel = pow(fresnel, 2.5);
  vec3 rimColor = vec3(0.5, 0.9, 0.0) * fresnel * 0.8;
  color += rimColor;

  // Light contrast on output: just enough to make highlights pop
  color = pow(color, vec3(0.92));

  gl_FragColor = vec4(color, 1.0);
}
