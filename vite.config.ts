import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
	base: "/",
	plugins: [
		react(),
		glsl(),
		tsconfigPaths(),
		{
			name: "404-foo",
			configureServer(server) {
				server.middlewares.use((req, res, next) => {
					if ((req as { url?: string }).url?.includes("xxx.dat")) {
						res.statusCode = 404;
						res.end("Not Found");
					} else {
						next();
					}
				});
			},
		},
	],
	preview: {
		port: 8080,
		strictPort: true,
	},
	server: {
		port: 8080,
		strictPort: true,
		host: true,
		origin: "http://0.0.0.0:8080",
	},
});
