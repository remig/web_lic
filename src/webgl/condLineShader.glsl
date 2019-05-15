attribute vec3 position;
attribute vec3 next;
attribute float direction;
attribute float order;
attribute vec3 condPointA;
attribute vec3 condPointB;

uniform mat4 projection;
uniform mat4 modelView;
uniform float aspect;
uniform float thickness;

void main() {

	vec2 aspectVec = vec2(aspect, 1.0);
	mat4 projViewModel = projection * modelView;

	vec4 condAProjected = projViewModel * vec4(condPointA, 1.0);
	vec4 condBProjected = projViewModel * vec4(condPointB, 1.0);
	vec2 condAScreen = condAProjected.xy / condAProjected.w * aspectVec;
	vec2 condBScreen = condBProjected.xy / condBProjected.w * aspectVec;

	vec4 currentProjected = projViewModel * vec4(position, 1.0);
	vec4 nextProjected = projViewModel * vec4(next, 1.0);
	vec2 a = currentProjected.xy / currentProjected.w * aspectVec;
	vec2 b = nextProjected.xy / nextProjected.w * aspectVec;

	bool aSide = (((b.x - a.x) * (condAScreen.y - a.y)) - ((b.y - a.y) * (condAScreen.x - a.x))) > 0.0;
	bool bSide = (((b.x - a.x) * (condBScreen.y - a.y)) - ((b.y - a.y) * (condBScreen.x - a.x))) > 0.0;

	if (aSide == bSide) {
		vec2 dir = vec2(0);
		if (order == 0.0) {
			dir = normalize(b - a);
		} else {
			dir = normalize(a - b);
		}
		vec2 normal = vec2(-dir.y, dir.x);
		normal *= thickness / 2.0;
		normal.x /= aspect;

		vec3 offset = vec3(normal * direction, 0.0);
		gl_Position = vec4(currentProjected.xyz + offset, 1.0);
	} else {
		gl_Position = vec4(0.0);
	}
}
