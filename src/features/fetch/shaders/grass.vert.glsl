uniform float uTime;
uniform float uSpeed;
uniform float uHalfWidth;
uniform float uWindStrength;
uniform float uGrassHeight;

attribute float bladeType;
attribute float bladeRand;

varying float vElevation;
varying float vSideGradient;
varying vec3 vNormal;
varying vec3 vFakeNormal;
varying vec3 vPosition;
varying float vBladeType;
varying float vBladeRand;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

float bezier(float t, float p1) {
  float invT = 1.0 - t;
  return invT * invT * 0.0 + 2.0 * invT * t * p1 + t * t * 1.0;
}

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec2 fade(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float cnoise(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0);
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = permute(permute(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm = 1.79284291400159 - 0.85373472095314 *
    vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  return 2.3 * n_xy;
}

vec3 deform(vec3 pos, float hash) {
  vec3 localPosition = pos;

  // Scale height by biome and per-instance variation
  float heightScale = uGrassHeight * mix(0.7, 1.3, bladeRand);
  localPosition.y *= heightScale;

  // Flower variants: wider, shorter
  if (bladeType >= 2.0) {
    localPosition.y *= 0.5;
    float petalWiden = 1.0 + (pos.y * 3.0);
    localPosition.x *= petalWiden;
  }

  // Bezier bending - use hash for consistent random bend direction
  float bendStrength = mix(0.2, 0.4, hash);
  float bendStart = mix(0.0, 0.3, hash);
  float normalizedY = pos.y;
  float t = clamp((normalizedY - bendStart) / (1.0 - bendStart), 0.0, 1.0);
  float topBendFactor = bezier(t, 0.1);
  float bendAngle = hash * 6.28318;
  vec3 bendDir = vec3(cos(bendAngle), 0.0, sin(bendAngle));
  localPosition += bendDir * bendStrength * topBendFactor;

  // Gentle sway - operates in blade-local space (works on sphere)
  float gentleSway = sin(uTime * uSpeed * 0.8 + hash * 10.0) * 0.08 * uWindStrength;
  vec3 gentleDir = vec3(0.707, 0.0, 0.707); // normalized (1,0,1)
  localPosition += gentleDir * gentleSway * normalizedY;

  // Strong wind (Perlin noise) - use instance position for spatial variation
  vec3 instancePos = instanceMatrix[3].xyz;
  float wave = cnoise(instancePos.xz * 0.3 + vec2(uTime * uSpeed * 0.2, 0.0));
  float strongWind = wave * 0.4 * uWindStrength;
  vec3 strongDir = vec3(0.0, 0.0, 1.0);
  localPosition += strongDir * strongWind * pow(normalizedY, 2.0);
  localPosition.y -= 0.08 * abs(strongWind) * pow(normalizedY, 2.0);

  return localPosition;
}

void main() {
  float hash = rand(vec2(instanceMatrix[3].x, instanceMatrix[3].z));
  vec3 p = deform(position, hash);
  vec3 offsetX = deform(position + vec3(0.01, 0.0, 0.0), hash);
  vec3 offsetY = deform(position + vec3(0.0, 0.01, 0.0), hash);

  // Instance matrix orients blade along sphere normal
  // Model matrix includes sphere group rotation
  vec4 worldPosition = modelMatrix * instanceMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;

  vElevation = position.y;
  vPosition = worldPosition.xyz;
  vSideGradient = 1.0 - ((position.x + uHalfWidth) / (2.0 * uHalfWidth));
  vBladeType = bladeType;
  vBladeRand = bladeRand;

  vec3 normalWS = normalize(cross(offsetX - p, offsetY - p));
  vNormal = normalWS;
  vec3 invNormal = vNormal;
  invNormal.x *= -1.0;
  vFakeNormal = mix(vNormal, invNormal, vSideGradient);
}
