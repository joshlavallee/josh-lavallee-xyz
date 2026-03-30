varying vec3 vColor;
varying float vAlpha;

uniform float uOpacity;
uniform float uSoftness;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;

  float alpha = smoothstep(0.5, 0.5 - uSoftness, dist) * vAlpha * uOpacity;
  gl_FragColor = vec4(vColor, alpha);
}
