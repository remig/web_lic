import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import glsl from 'vite-plugin-glsl';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
	base: '/',
	appType: 'mpa',
	plugins: [vue(), glsl(), tsconfigPaths()],
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
