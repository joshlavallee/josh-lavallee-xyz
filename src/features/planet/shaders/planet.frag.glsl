uniform float uTime;
uniform float uSwirlIntensity;
uniform float uAmberIntensity;
uniform vec3 uSunDirection;
uniform float uRaySteps;
uniform float uShellThickness;
uniform float uDensityScale;
uniform float uCurlScale;
uniform float uCurlStrength;
uniform float uEmissionStrength;
uniform float uContrast;

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

mat3 rotationMatrix = mat3(
   0.00,  0.80,  0.60,
  -0.80,  0.36, -0.48,
  -0.60, -0.48,  0.64
);

// ─── FBM with rotation per octave ───

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

// ─── Curl Noise for vortex structure ───
// Computes curl of a 3-component potential field using finite differences.
// 6 noise evaluations per call. Produces divergence-free flow → spiral vortices.

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

// ─── Domain Warping (single q layer, simplified for raymarching perf) ───

float warpedNoise(vec3 p, float warpStrength, float time) {
  vec3 q = vec3(
    fbm(p + vec3(0.0, 0.0, 0.0) + time * 0.02),
    fbm(p + vec3(5.2, 1.3, 2.8) + time * 0.015),
    fbm(p + vec3(1.7, 9.2, 4.6) + time * 0.018)
  );

  return fbm(p + warpStrength * q);
}

// ─── Atmosphere color ramp ───
// Wide ramp from near-black voids through vivid greens to amber storm cores.
// amberBias controls how early amber appears in the density range.

vec3 atmosphereColor(float density, float amberBias) {
  float n = clamp(density, 0.0, 1.0);

  vec3 voidBlack   = vec3(0.02, 0.04, 0.02);
  vec3 deepForest  = vec3(0.04, 0.16, 0.02);
  vec3 vividGreen  = vec3(0.18, 0.55, 0.05);
  vec3 chartreuse  = vec3(0.55, 0.84, 0.02);
  vec3 neonLime    = vec3(0.75, 1.0, 0.0);
  vec3 amber       = vec3(0.80, 0.40, 0.0);
  vec3 hotOrange   = vec3(0.94, 0.56, 0.0);

  vec3 color = mix(voidBlack, deepForest, smoothstep(0.0, 0.2, n));
  color = mix(color, vividGreen, smoothstep(0.15, 0.4, n));
  color = mix(color, chartreuse, smoothstep(0.35, 0.6, n));
  color = mix(color, neonLime, smoothstep(0.55, 0.8, n));

  float amberStart = 0.75 - amberBias * 0.3;
  float amberMix = smoothstep(amberStart, amberStart + 0.15, n);
  vec3 hotColor = mix(amber, hotOrange, smoothstep(amberStart + 0.1, 1.0, n));
  color = mix(color, hotColor, amberMix);

  return color;
}

// ─── Sample atmosphere at a point ───
// Returns vec4(color.rgb, density). Called once per raymarch step.

vec4 sampleAtmosphere(vec3 p, float time) {
  vec3 curl = curlNoise(p * uCurlScale + time * 0.3);
  vec3 displaced = p + curl * uCurlStrength;

  float density = warpedNoise(displaced, uSwirlIntensity, time);
  density = clamp(density * 0.5 + 0.5, 0.0, 1.0);
  density = pow(density, uContrast);

  vec3 color = atmosphereColor(density, uAmberIntensity);
  return vec4(color, density);
}

// ─── Main: volumetric raymarching ───

void main() {
  vec3 objNormal = normalize(vPosition);
  vec3 eyeViewDir = normalize(vEyePos);
  float slowTime = uTime * 0.02;

  // Path length correction: rays at grazing angles travel through more atmosphere
  float viewDotNormal = max(dot(-eyeViewDir, vNormal), 0.1);
  float totalDist = uShellThickness / viewDotNormal;
  int numSteps = int(uRaySteps + 0.5);
  float stepSize = totalDist / uRaySteps;

  // Lighting (computed once, same for all steps since shell is thin)
  float diffuse = max(dot(vNormal, normalize(uSunDirection)), 0.0);
  float ambient = 0.08;
  float lighting = ambient + diffuse * 0.92;

  // Raymarch through atmosphere shell
  vec3 accColor = vec3(0.0);
  float accAlpha = 0.0;

  for (int i = 0; i < 24; i++) {
    if (i >= numSteps) break;
    if (accAlpha > 0.95) break;

    float t = (float(i) + 0.5) / uRaySteps;
    vec3 samplePos = (vPosition + objNormal * t * totalDist) * 1.6;

    vec4 atmo = sampleAtmosphere(samplePos, slowTime);
    vec3 color = atmo.rgb;
    float density = atmo.a;

    // Lit component + self-luminous emission
    vec3 litColor = color * lighting;
    vec3 emissive = color * uEmissionStrength * density;
    vec3 stepColor = litColor + emissive;

    // Front-to-back compositing
    float alpha = density * stepSize * uDensityScale;
    accColor += (1.0 - accAlpha) * stepColor * alpha;
    accAlpha += (1.0 - accAlpha) * alpha;
  }

  // Fresnel rim: neon green glow at planet edge
  float fresnel = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
  fresnel = pow(fresnel, 2.5);
  vec3 rimColor = vec3(0.5, 0.9, 0.0) * fresnel * 0.8;
  accColor += rimColor;

  // Gamma correction
  accColor = pow(accColor, vec3(0.92));

  gl_FragColor = vec4(accColor, 1.0);
}
