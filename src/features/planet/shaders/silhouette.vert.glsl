varying vec3 vNormal;
varying vec3 vEyePos;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vEyePos = (modelViewMatrix * vec4(position, 1.0)).xyz;

  gl_Position = projectionMatrix * vec4(vEyePos, 1.0);
}
