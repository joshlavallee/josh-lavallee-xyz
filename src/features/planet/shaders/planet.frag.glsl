uniform float uTime;
uniform float uSwirlIntensity;   // 3-pass domain warp strength
uniform float uAmberIntensity;   // green layer thinning (higher = more amber hot spots)
uniform vec3 uSunDirection;
uniform float uRaySteps;         // unused in layered mode, kept for compatibility
uniform float uShellThickness;   // unused in layered mode, kept for compatibility
uniform float uDensityScale;     // overall brightness multiplier
uniform float uCurlScale;        // curl noise frequency for vortex tightness
uniform float uCurlStrength;     // curl noise displacement magnitude
uniform float uEmissionStrength; // self-glow intensity
uniform float uContrast;         // green layer contrast curve

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vEyePos;

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

const mat3 rotationMatrix = mat3(
   0.00,  0.80,  0.60,
  -0.80,  0.36, -0.48,
  -0.60, -0.48,  0.64
);

// ─── FBM variants (different octave counts for perf) ───

float fbm3(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * snoise3D(p);
    p = rotationMatrix * p * 2.0 + vec3(1.7, 9.2, 3.4);
    a *= 0.5;
  }
  return v;
}

float fbm5(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * snoise3D(p);
    p = rotationMatrix * p * 2.0 + vec3(1.7, 9.2, 3.4);
    a *= 0.5;
  }
  return v;
}

// ─── Curl Noise for vortex structure ───

vec3 curlNoise(vec3 p) {
  float e = 0.1;
  float n1 = snoise3D(p + vec3(0.0, e, -e));
  float n2 = snoise3D(p + vec3(-e, 0.0, e));
  float n3 = snoise3D(p + vec3(e, -e, 0.0));
  float n4 = snoise3D(p + vec3(0.0, -e, e));
  float n5 = snoise3D(p + vec3(e, 0.0, -e));
  float n6 = snoise3D(p + vec3(-e, e, 0.0));
  return vec3(n1 - n4, n2 - n5, n3 - n6) / (2.0 * e);
}

// ─── Layer 1: Deep Atmosphere (dark brown base) ───
// Very slow, low-frequency. Only visible where both upper layers thin.

vec3 deepLayer(vec3 p, float time) {
  float n = fbm3(p * 0.6 + time * 0.003);
  n = n * 0.5 + 0.5;

  vec3 darkBrown = vec3(0.10, 0.04, 0.0);
  vec3 rustBrown = vec3(0.40, 0.16, 0.0);
  return mix(darkBrown, rustBrown, n);
}

// ─── Atmosphere Layer (green with integrated amber hot regions) ───
// Amber appears in vortex cores/crevices of the SAME turbulent flow.
// A low-freq heat map biases regions toward amber, sharing warped coords
// so boundaries are organic and turbulent, not flat blobs.

vec4 greenLayer(vec3 p, float time) {
  // Curl noise for spiral vortex structure
  vec3 curl = curlNoise(p * uCurlScale + time * 0.3);
  vec3 cp = p + curl * uCurlStrength;

  // 3-pass domain warping: creates thick, viscous "stirred paint" look
  float ws = uSwirlIntensity;

  vec3 w1 = vec3(
    fbm3(cp + time * 0.015),
    fbm3(cp + vec3(5.2, 1.3, 2.8) + time * 0.012),
    fbm3(cp + vec3(9.1, 4.7, 1.3) + time * 0.01)
  );
  vec3 w2 = vec3(
    fbm3(cp + w1 * ws + vec3(1.7, 9.2, 0.0) + time * 0.008),
    fbm3(cp + w1 * ws + vec3(8.3, 2.8, 3.1) + time * 0.009),
    fbm3(cp + w1 * ws + vec3(2.1, 6.3, 7.4) + time * 0.007)
  );
  vec3 w3 = vec3(
    fbm3(cp + w2 * ws + vec3(3.1, 7.8, 2.3) + time * 0.005),
    fbm3(cp + w2 * ws + vec3(6.2, 1.4, 8.7) + time * 0.006),
    fbm3(cp + w2 * ws + vec3(4.8, 3.9, 5.1) + time * 0.004)
  );

  // Final green detail
  float n = fbm5(cp + w3 * ws);
  n = n * 0.5 + 0.5;
  n = pow(n, uContrast);

  // Heat map: low-freq noise on SAME warped coords determines amber regions
  // Shares the turbulent flow so boundaries are organic, not flat blobs
  float heat = fbm3(cp * 0.35 + vec3(42.0, 17.0, 0.0) + time * 0.004);
  heat = heat * 0.5 + 0.5;
  heat = smoothstep(0.55, 0.75, heat) * uAmberIntensity;

  // Green color ramp: deep crevice shadows → vivid radioactive → yellow-green
  vec3 crevice     = vec3(0.04, 0.18, 0.02);
  vec3 deepGreen   = vec3(0.10, 0.38, 0.03);
  vec3 midGreen    = vec3(0.20, 0.67, 0.07);
  vec3 brightGreen = vec3(0.30, 0.90, 0.08);
  vec3 yellowGreen = vec3(0.55, 0.95, 0.14);
  vec3 neonPeak    = vec3(0.70, 1.10, 0.18);

  vec3 color = mix(crevice, deepGreen, smoothstep(0.0, 0.12, n));
  color = mix(color, midGreen, smoothstep(0.08, 0.35, n));
  color = mix(color, brightGreen, smoothstep(0.3, 0.60, n));
  color = mix(color, yellowGreen, smoothstep(0.55, 0.80, n));
  color = mix(color, neonPeak, smoothstep(0.80, 0.95, n));

  // Amber bleeds into crevices and mid-tones of hot regions
  // Only affects low/mid noise values, bright green crests stay green
  vec3 amberAbyss  = vec3(0.22, 0.10, 0.02);
  vec3 amberDeep   = vec3(0.45, 0.22, 0.05);
  vec3 amberBright = vec3(0.65, 0.38, 0.10);
  vec3 amberColor  = mix(amberAbyss, amberDeep, smoothstep(0.0, 0.2, n));
  amberColor = mix(amberColor, amberBright, smoothstep(0.15, 0.5, n));
  float amberMask  = heat * (1.0 - smoothstep(0.35, 0.7, n));
  color = mix(color, amberColor, amberMask);

  return vec4(color, 1.0);
}

// ─── Main: three-layer compositing ───

void main() {
  vec3 p = vPosition * 1.2;
  vec3 eyeViewDir = normalize(vEyePos);
  float time = uTime * 0.02;

  // View-dependent parallax: sample at two depths for cloud volume illusion
  vec3 objNormal = normalize(vPosition);
  vec3 parallaxOffset = objNormal * 0.04;
  vec4 frontLayer = greenLayer(p, time);
  vec4 backLayer = greenLayer(p - parallaxOffset, time * 0.95 + 0.5);

  // Composite: back layer dimmed underneath, front on top
  vec3 color = backLayer.rgb * 0.5;
  color = mix(color, frontLayer.rgb, 0.75);

  // Wrap lighting: soft terminator, shadow side never fully black
  vec3 sunDir = normalize(uSunDirection);
  float wrap = pow(max(dot(vNormal, sunDir) * 0.5 + 0.5, 0.0), 1.5);
  float lit = 0.65 * wrap;

  // Self-emission: atmosphere glows from within
  float emission = uEmissionStrength * 0.35;

  // Shadow side: desaturate and shift toward cold teal-green
  float shadowFactor = smoothstep(-0.2, 0.3, dot(vNormal, sunDir));
  vec3 shadowTint = color * vec3(0.4, 0.7, 0.5);
  color = mix(shadowTint, color, shadowFactor);

  vec3 finalColor = color * (lit + emission) * uDensityScale;

  // Fresnel for limb effects
  float fresnel = 1.0 - max(dot(vNormal, -eyeViewDir), 0.0);

  // Limb brightening: atmosphere optically thicker at grazing angles
  float rimFresnel = pow(fresnel, 2.0);
  vec3 rimColor = vec3(0.40, 1.0, 0.13) * rimFresnel * 0.7;
  finalColor += rimColor;

  // Limb haze: aggressively reduce detail near edge, thick atmospheric scattering
  float limbHaze = pow(fresnel, 1.2);
  vec3 hazeColor = vec3(0.20, 0.75, 0.10);
  finalColor = mix(finalColor, hazeColor * (lit + emission) * 0.6, limbHaze * 0.55);

  // Limb desaturation: lose color detail at the very edge
  float edgeFade = pow(fresnel, 3.0);
  vec3 edgeGlow = vec3(0.30, 0.85, 0.10) * (lit + emission) * 0.4;
  finalColor = mix(finalColor, edgeGlow, edgeFade * 0.3);

  // Gamma correction
  finalColor = pow(finalColor, vec3(0.92));

  gl_FragColor = vec4(finalColor, 1.0);
}
