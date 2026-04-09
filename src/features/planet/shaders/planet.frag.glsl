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

// ─── Ridged FBM: sharp filamentary features like smoke tendrils ───

float ridgedFbm3(vec3 p) {
  float v = 0.0, a = 0.5;
  float prev = 1.0;
  for (int i = 0; i < 3; i++) {
    float n = 1.0 - abs(snoise3D(p));
    n = n * n;             // sharpen the ridges
    n *= prev;             // ridge succession: ridges beget ridges
    prev = n;
    v += a * n;
    p = rotationMatrix * p * 2.1 + vec3(3.1, 1.7, 5.9);
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
  // Macro flow - large-scale banding currents
  vec3 macroFlow = curlNoise(p * 0.25 + time * 0.015) * 0.06;
  vec3 mp = p + macroFlow;

  // Curl noise - medium frequency vortices
  vec3 curl = curlNoise(mp * uCurlScale + time * 0.08);
  vec3 cp = mp + curl * uCurlStrength;

  // 3-pass domain warping - creates the "ink in water" marble effect
  float ws = uSwirlIntensity;

  vec3 w1 = vec3(
    fbm3(cp + time * 0.005),
    fbm3(cp + vec3(5.2, 1.3, 2.8) + time * 0.004),
    fbm3(cp + vec3(9.1, 4.7, 1.3) + time * 0.004)
  );
  vec3 w2 = vec3(
    fbm3(cp + w1 * ws + vec3(1.7, 9.2, 0.0) + time * 0.003),
    fbm3(cp + w1 * ws + vec3(8.3, 2.8, 3.1) + time * 0.003),
    fbm3(cp + w1 * ws + vec3(2.1, 6.3, 7.4) + time * 0.003)
  );
  vec3 w3 = vec3(
    fbm3(cp + w2 * ws + vec3(3.1, 7.8, 2.3) + time * 0.002),
    w2.z,
    fbm3(cp + w2 * ws + vec3(4.8, 3.9, 5.1) + time * 0.002)
  );

  vec3 warpedPos = cp + w3 * ws;
  float n = fbm5(warpedPos);
  n = n * 0.5 + 0.5;

  // Ridged detail for wispy tendrils in some regions
  float regionMask = snoise3D(p * 0.25 + vec3(13.7, 8.3, 21.1) + time * 0.001);
  regionMask = regionMask * 0.5 + 0.5;
  float nRidged = ridgedFbm3(warpedPos + vec3(2.3, 0.0, 4.1));
  float wispyBlend = smoothstep(0.2, 0.6, regionMask);
  n = mix(n, nRidged, 0.08 + wispyBlend * 0.17);

  n = pow(n, uContrast);

  // Amber heat map: large diffuse warm storm regions
  // Uses domain-warped coords for organic turbulent edges
  float heat = fbm3(cp * 0.6 + vec3(42.0, 17.0, 0.0) + time * 0.001);
  heat = heat * 0.5 + 0.5;
  float heatMask = smoothstep(0.48, 0.68, heat) * uAmberIntensity;

  // Green color ramp: near-black → deep → mid → bright → lime → yellow-green
  vec3 darkForest   = vec3(0.005, 0.02, 0.003);
  vec3 deepGreen    = vec3(0.02, 0.10, 0.01);
  vec3 midGreen     = vec3(0.06, 0.30, 0.025);
  vec3 brightGreen  = vec3(0.18, 0.58, 0.04);
  vec3 limeGreen    = vec3(0.35, 0.75, 0.07);
  vec3 yellowGreen  = vec3(0.50, 0.85, 0.12);

  vec3 color = mix(darkForest, deepGreen, smoothstep(0.0, 0.12, n));
  color = mix(color, midGreen, smoothstep(0.06, 0.28, n));
  color = mix(color, brightGreen, smoothstep(0.2, 0.5, n));
  color = mix(color, limeGreen, smoothstep(0.4, 0.7, n));
  color = mix(color, yellowGreen, smoothstep(0.65, 0.9, n));

  // Amber storm ramp
  vec3 amberDark   = vec3(0.30, 0.14, 0.02);
  vec3 amberMid    = vec3(0.55, 0.30, 0.05);
  vec3 amberBright = vec3(0.78, 0.48, 0.10);
  vec3 amberGlow   = vec3(0.90, 0.60, 0.16);
  vec3 amberColor  = mix(amberDark, amberMid, smoothstep(0.0, 0.3, n));
  amberColor = mix(amberColor, amberBright, smoothstep(0.2, 0.55, n));
  amberColor = mix(amberColor, amberGlow, smoothstep(0.5, 0.8, n));

  // Yellow-green transition zone, then amber blend
  vec3 yellowTrans = mix(color, vec3(0.50, 0.65, 0.08), heatMask * 0.5);
  color = mix(color, yellowTrans, heatMask * 0.6);
  color = mix(color, amberColor, heatMask * 0.85);

  // Tonal variation: cool teal vs warm shifts across the surface
  float toneVar = snoise3D(p * 0.3 + vec3(7.3, 22.1, 4.8) + time * 0.001);
  toneVar = toneVar * 0.5 + 0.5;
  vec3 coolShift = color * vec3(0.7, 1.0, 0.85);
  vec3 warmShift = color * vec3(1.15, 0.95, 0.65);
  color = mix(color, mix(coolShift, warmShift, toneVar), 0.25);

  return vec4(color, 1.0);
}

// ─── Main: three-layer compositing ───

void main() {
  vec3 p = vPosition * 0.72;  // slightly more detail across the surface
  vec3 eyeViewDir = normalize(vEyePos);
  float time = uTime * 0.008;  // much slower movement

  // Single full-quality atmosphere pass
  vec4 frontLayer = greenLayer(p, time);

  // Cheap depth underlayer: one fbm3 call instead of a second greenLayer
  vec3 objNormal = normalize(vPosition);
  float depthNoise = fbm3((p - objNormal * 0.04) * 0.8 + time * 0.003);
  depthNoise = depthNoise * 0.5 + 0.5;
  vec3 underDark = vec3(0.02, 0.06, 0.005);
  vec3 underBright = vec3(0.12, 0.38, 0.03);
  vec3 underWarm = vec3(0.20, 0.10, 0.02);
  float underHeat = snoise3D(p * 0.25 + vec3(15.0, 8.0, 3.0)) * 0.5 + 0.5;
  vec3 underColor = mix(underDark, underBright, depthNoise);
  underColor = mix(underColor, underWarm, smoothstep(0.5, 0.75, underHeat) * 0.45);

  // Composite: rich underlayer with full-detail front
  vec3 color = underColor * 0.5;
  color = mix(color, frontLayer.rgb, 0.72);

  // Wrap lighting: soft terminator, shadow side never fully black
  vec3 sunDir = normalize(uSunDirection);
  float wrap = pow(max(dot(vNormal, sunDir) * 0.5 + 0.5, 0.0), 1.5);
  float lit = 0.65 * wrap;

  // Self-emission: atmosphere glows from within
  float emission = uEmissionStrength * 0.25;

  // Shadow side: desaturate and shift toward cold teal-green
  float shadowFactor = smoothstep(-0.2, 0.3, dot(vNormal, sunDir));
  vec3 shadowTint = color * vec3(0.4, 0.7, 0.5);
  color = mix(shadowTint, color, shadowFactor);

  vec3 finalColor = color * (lit + emission) * uDensityScale;

  // Fresnel for limb effects
  float fresnel = 1.0 - max(dot(vNormal, -eyeViewDir), 0.0);

  // Limb brightening: thin bright rim at grazing angles
  float rimFresnel = pow(fresnel, 3.5);
  vec3 rimColor = vec3(0.40, 1.0, 0.13) * rimFresnel * 0.4;
  finalColor += rimColor;

  // Limb haze: very subtle atmospheric scattering at the edge
  float limbHaze = pow(fresnel, 4.0);
  vec3 hazeColor = vec3(0.20, 0.75, 0.10);
  finalColor = mix(finalColor, hazeColor * (lit + emission) * 0.5, limbHaze * 0.25);

  // Limb desaturation: lose color detail at the very edge
  float edgeFade = pow(fresnel, 5.0);
  vec3 edgeGlow = vec3(0.30, 0.85, 0.10) * (lit + emission) * 0.3;
  finalColor = mix(finalColor, edgeGlow, edgeFade * 0.25);

  // Fake bloom: bright areas get a soft luminance boost
  float lum = dot(finalColor, vec3(0.2, 0.7, 0.1));
  float bloomMask = smoothstep(0.45, 0.8, lum);
  finalColor += finalColor * bloomMask * 0.15;

  // Gamma correction
  finalColor = pow(finalColor, vec3(0.92));

  gl_FragColor = vec4(finalColor, 1.0);
}
