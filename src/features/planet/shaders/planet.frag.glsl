uniform float uTime;
uniform float uWarpStrength;
uniform float uHeatAmount;
uniform float uPolarBias;
uniform float uEmissionStrength;
uniform float uRedMode;
uniform vec3 uSunDirection;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;

// ─── Simplex 3D Noise (Gustavson / Ashima Arts, MIT) ───

vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
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
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ─── FBM with variable octaves ───

float fbm(vec3 p, int octaves) {
  float val = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  float total = 0.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    val += snoise(p * freq) * amp;
    total += amp;
    amp *= 0.45;
    freq *= 2.1;
  }
  return val / total;
}

// ─── Domain-warped FBM ───

float warpedFbm(vec3 p, float t) {
  float slow = t * 0.0004;
  float qx = fbm(p + vec3(0.0, 0.0, slow), 3);
  float qy = fbm(p + vec3(5.2, 1.3, slow * 0.7), 3);
  float qz = fbm(p + vec3(2.1, 7.8, slow * 0.9), 3);
  vec3 q = vec3(qx, qy, qz);
  float rx = fbm(p + uWarpStrength * q + vec3(1.7, 9.2, slow * 0.5), 4);
  float ry = fbm(p + uWarpStrength * q + vec3(8.3, 2.8, slow * 0.8), 4);
  float rz = fbm(p + uWarpStrength * q + vec3(3.7, 5.1, slow * 0.6), 4);
  vec3 r = vec3(rx, ry, rz);
  return fbm(p + (uWarpStrength + 0.5) * r + vec3(0.0, 0.0, slow * 0.3), 4);
}

// ─── Main ───

void main() {
  vec3 nPos = normalize(vPosition);
  vec3 pos = nPos * 0.7;

  // === SWIRL PATTERN ===
  float pattern = warpedFbm(pos, uTime);
  float t = clamp(pattern * 0.5 + 0.5, 0.0, 1.0);

  // Atmospheric depth — cheap single FBM instead of full domain warp
  float depth = fbm(pos * 1.4 + vec3(7.0, 3.0, 1.0) + vec3(uTime * 0.0003), 4);
  float d = clamp(depth * 0.5 + 0.5, 0.0, 1.0);

  // Fine wispy detail layer (3 octaves — subtle, doesn't need full detail)
  float fine = fbm(nPos * 5.0 + vec3(uTime * 0.0002), 3);
  float f = clamp(fine * 0.5 + 0.5, 0.0, 1.0);

  // Blend: large swirls + depth + fine wisps
  t = t * 0.50 + d * 0.28 + f * 0.22;
  t = smoothstep(0.08, 0.92, t);
  t = pow(t, 1.1);

  // === HEAT MAP — patches competing with green for space ===
  float hSlow = uTime * 0.00025;
  float h1 = fbm(nPos * 0.8 + vec3(20.0, 10.0, hSlow), 3);
  float h2 = fbm(nPos * 1.1 + vec3(8.0, 15.0, hSlow * 0.5), 3);
  float h3 = fbm(nPos * 1.8 + vec3(14.0, 3.0, hSlow * 0.8), 3);
  float latitude = abs(nPos.y);
  float polarBiasVal = smoothstep(0.2, 0.7, latitude) * uPolarBias;
  float patch1 = smoothstep(0.55, 0.72, h1 * 0.5 + 0.5 + polarBiasVal);
  float patch2 = smoothstep(0.59, 0.75, h2 * 0.5 + 0.5 + polarBiasVal * 0.5);
  float patch3 = smoothstep(0.63, 0.78, h3 * 0.5 + 0.5);
  float orangeAmount = clamp(max(patch1 * 0.85, max(patch2 * 0.7, patch3 * 0.5)), 0.0, 1.0);
  orangeAmount *= uHeatAmount * 2.0;
  orangeAmount = clamp(orangeAmount, 0.0, 1.0);

  // === GREEN RAMP ===
  vec3 gAbyss  = vec3(0.008, 0.03, 0.012);
  vec3 gDeep   = vec3(0.018, 0.07, 0.022);
  vec3 gDark   = vec3(0.035, 0.14, 0.03);
  vec3 gForest = vec3(0.07, 0.26, 0.042);
  vec3 gMid    = vec3(0.14, 0.40, 0.06);
  vec3 gMid2   = vec3(0.22, 0.54, 0.08);
  vec3 gBright = vec3(0.32, 0.68, 0.10);
  vec3 gLime   = vec3(0.48, 0.80, 0.13);
  vec3 gYellow = vec3(0.65, 0.88, 0.18);

  vec3 greenColor;
  if (t < 0.05) greenColor = mix(gAbyss, gDeep, t / 0.05);
  else if (t < 0.12) greenColor = mix(gDeep, gDark, (t - 0.05) / 0.07);
  else if (t < 0.20) greenColor = mix(gDark, gForest, (t - 0.12) / 0.08);
  else if (t < 0.32) greenColor = mix(gForest, gMid, (t - 0.20) / 0.12);
  else if (t < 0.46) greenColor = mix(gMid, gMid2, (t - 0.32) / 0.14);
  else if (t < 0.58) greenColor = mix(gMid2, gBright, (t - 0.46) / 0.12);
  else if (t < 0.74) greenColor = mix(gBright, gLime, (t - 0.58) / 0.16);
  else greenColor = mix(gLime, gYellow, (t - 0.74) / 0.26);

  // === RED RAMP (for red mode) ===
  vec3 rAbyss  = vec3(0.03, 0.008, 0.008);
  vec3 rDeep   = vec3(0.08, 0.015, 0.012);
  vec3 rDark   = vec3(0.18, 0.03, 0.02);
  vec3 rMid    = vec3(0.28, 0.05, 0.025);
  vec3 rBright = vec3(0.40, 0.08, 0.03);
  vec3 rHot    = vec3(0.52, 0.11, 0.04);
  vec3 rGlow   = vec3(0.60, 0.15, 0.05);
  vec3 rFlare  = vec3(0.68, 0.20, 0.07);
  vec3 rWhite  = vec3(0.75, 0.28, 0.10);

  vec3 redColor;
  if (t < 0.05) redColor = mix(rAbyss, rDeep, t / 0.05);
  else if (t < 0.12) redColor = mix(rDeep, rDark, (t - 0.05) / 0.07);
  else if (t < 0.20) redColor = mix(rDark, rMid, (t - 0.12) / 0.08);
  else if (t < 0.32) redColor = mix(rMid, rBright, (t - 0.20) / 0.12);
  else if (t < 0.46) redColor = mix(rBright, rHot, (t - 0.32) / 0.14);
  else if (t < 0.58) redColor = mix(rHot, rGlow, (t - 0.46) / 0.12);
  else if (t < 0.74) redColor = mix(rGlow, rFlare, (t - 0.58) / 0.16);
  else redColor = mix(rFlare, rWhite, (t - 0.74) / 0.26);

  // === ORANGE RAMP ===
  vec3 oBrown  = vec3(0.04, 0.015, 0.004);
  vec3 oDark   = vec3(0.14, 0.05, 0.008);
  vec3 oDeep   = vec3(0.32, 0.12, 0.015);
  vec3 oMid    = vec3(0.52, 0.22, 0.025);
  vec3 oBright = vec3(0.70, 0.32, 0.035);
  vec3 oHot    = vec3(0.82, 0.42, 0.05);
  vec3 oGlow   = vec3(0.88, 0.50, 0.07);

  vec3 orangeColor;
  if (t < 0.05) orangeColor = mix(oBrown, oDark, t / 0.05);
  else if (t < 0.12) orangeColor = mix(oDark, oDeep, (t - 0.05) / 0.07);
  else if (t < 0.22) orangeColor = mix(oDeep, oMid, (t - 0.12) / 0.10);
  else if (t < 0.38) orangeColor = mix(oMid, oBright, (t - 0.22) / 0.16);
  else if (t < 0.55) orangeColor = mix(oBright, oHot, (t - 0.38) / 0.17);
  else if (t < 0.75) orangeColor = mix(oHot, oGlow, (t - 0.55) / 0.20);
  else orangeColor = mix(oGlow, oGlow * 1.1, (t - 0.75) / 0.25);

  // === BLEND ===
  vec3 baseGreen = mix(greenColor, orangeColor, orangeAmount);
  vec3 color = mix(baseGreen, redColor, uRedMode);

  // === DIRECTIONAL SUNLIGHT ===
  vec3 sunDir = normalize(uSunDirection);
  float sunDot = max(dot(nPos, sunDir), 0.0);
  float sunlight = smoothstep(0.0, 1.0, sunDot);
  color *= 0.78 + 0.25 * sunlight;
  color = mix(color, color * vec3(0.9, 0.95, 1.05), (1.0 - sunlight) * 0.15);

  // === ATMOSPHERIC EFFECTS ===
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float viewAngle = max(dot(nPos, viewDir), 0.0);

  // Limb darkening
  float limbDark = smoothstep(0.0, 0.4, viewAngle);
  color *= 0.55 + 0.45 * limbDark;

  // Atmospheric haze at limb
  float fresnel = pow(1.0 - viewAngle, 3.0);
  vec3 greenHaze = vec3(0.06, 0.30, 0.10);
  vec3 redHaze = vec3(0.30, 0.06, 0.04);
  vec3 hazeColor = mix(greenHaze, redHaze, uRedMode);
  color = mix(color, hazeColor, fresnel * 0.45);

  // === SELF-EMISSION ===
  color += color * t * uEmissionStrength;

  gl_FragColor = vec4(color, 1.0);
}
