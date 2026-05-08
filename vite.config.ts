import {fileURLToPath} from 'url';
import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue2';
import glsl from 'vite-plugin-glsl';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
	base: '/',
	appType: 'mpa',
	plugins: [vue(), glsl(), tsconfigPaths()],
	resolve: {
		alias: [
			// vue-color main dist uses Vue 3-only APIs; redirect to the Vue 2.7-compatible build
			{
				find: /^vue-color$/,
				replacement: fileURLToPath(
					new URL('node_modules/vue-color/dist/vue2/vue-color.js', import.meta.url),
				),
			},
		],
	},
	preview: {
		port: 8080,
		strictPort: true,
	},
	server: {
		port: 8080,
		strictPort: true,
		host: true,
		origin: 'http://0.0.0.0:8080',
	},
});
