attribute vec3 position;
attribute float direction;
attribute float order;
attribute vec3 next;
attribute vec3 color;

uniform mat4 projection;
uniform mat4 modelView;
uniform float aspect;
uniform float thickness;

varying lowp vec3 vColor;

void main() {
  vec2 aspectVec = vec2(aspect, 1.0);
  mat4 projViewModel = projection * modelView;
  vec4 currentProjected = projViewModel * vec4(position, 1.0);
  vec4 nextProjected = projViewModel * vec4(next, 1.0);

  //get 2D screen space with W divide and aspect correction
  vec2 currentScreen = currentProjected.xy / currentProjected.w * aspectVec;
  vec2 nextScreen = nextProjected.xy / nextProjected.w * aspectVec;

  vec2 dir = vec2(0);
  if (order == 0.0) {
    dir = normalize(nextScreen - currentScreen);
  } else {
    dir = normalize(currentScreen - nextScreen);
  }
  vec2 normal = vec2(-dir.y, dir.x);
  normal *= thickness / 2.0;
  normal.x /= aspect;

  vec3 offset = vec3(normal * direction, 0.0);
  gl_Position = vec4(currentProjected.xyz + offset, 1.0);
  vColor = color;
}
