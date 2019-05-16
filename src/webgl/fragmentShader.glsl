uniform lowp vec4 color;

void main() {
	gl_FragColor = color;
	gl_FragColor.rgb *= gl_FragColor.a;
}
