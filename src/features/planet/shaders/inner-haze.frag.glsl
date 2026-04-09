varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);

  float haze = smoothstep(0.45, 1.0, rim) * 0.06;
  haze += pow(rim, 4.0) * 0.10;

  vec3 col = vec3(0.06, 0.32, 0.07);

  gl_FragColor = vec4(col, haze);
}
