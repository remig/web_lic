attribute vec3 position;
attribute vec3 color;

uniform mat4 projection;
uniform mat4 modelView;

varying lowp vec3 vColor;

void main() {
  gl_Position = projection * modelView * vec4(position, 1.0);
  vColor = color;
}
