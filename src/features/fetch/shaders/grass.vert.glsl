uniform float u_time;
uniform vec3 u_dogPosition;
uniform float u_nightBlend;

attribute vec3 instanceColor;
attribute float instanceHeight;
attribute float instanceLean;
attribute vec3 instanceOffset;

varying vec3 vColor;
varying float vHeight;

const float WIND_STRENGTH = 0.08;
const float WIND_SPEED = 2.0;
const float DOG_RADIUS = 0.8;
const float DOG_BEND_STRENGTH = 0.6;

void main() {
  float heightFactor = position.y;

  vec3 worldOffset = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float windPhase = u_time * WIND_SPEED + worldOffset.x * 1.5 + worldOffset.z * 0.7;
  float windX = sin(windPhase) * WIND_STRENGTH * heightFactor;
  float windZ = cos(windPhase * 0.7 + 1.3) * WIND_STRENGTH * 0.5 * heightFactor;

  vec3 toDog = worldOffset - u_dogPosition;
  float dogDist = length(toDog);
  vec3 dogBend = vec3(0.0);
  if (dogDist < DOG_RADIUS && dogDist > 0.001) {
    float bendAmount = (1.0 - dogDist / DOG_RADIUS) * DOG_BEND_STRENGTH * heightFactor;
    dogBend = normalize(toDog) * bendAmount;
  }

  float leanX = sin(instanceLean) * 0.05 * heightFactor;
  float leanZ = cos(instanceLean) * 0.05 * heightFactor;

  vec3 pos = position;
  pos.y *= instanceHeight;

  pos.x += windX + dogBend.x + leanX;
  pos.z += windZ + dogBend.z + leanZ;

  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  vColor = instanceColor;
  vHeight = heightFactor;
}
