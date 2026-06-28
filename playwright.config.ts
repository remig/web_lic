import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './test/integration',
	fullyParallel: false,
	use: {
		baseURL: 'http://localhost:8080',
		viewport: { width: 1500, height: 900 },
		trace: 'on-first-retry',
	},
	webServer: {
		command: 'npm run start',
		url: 'http://localhost:8080',
		reuseExistingServer: true,
	},
});
