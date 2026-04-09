varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float rim = 1.0 - max(dot(vNormal, viewDir), 0.0);

  // Layered atmospheric falloff — soft inner haze + defined outer edge
  float innerHaze = smoothstep(0.3, 1.0, rim) * 0.08;
  float midHaze = pow(rim, 3.0) * 0.15;
  float outerGlow = pow(rim, 6.0) * 0.25;

  float alpha = innerHaze + midHaze + outerGlow;

  // Color shifts from warm green near surface to cooler teal at edge
  vec3 innerColor = vec3(0.10, 0.45, 0.06);
  vec3 outerColor = vec3(0.04, 0.28, 0.10);
  vec3 glowColor = mix(innerColor, outerColor, pow(rim, 2.0));

  gl_FragColor = vec4(glowColor, alpha);
}
