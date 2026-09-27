import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { playwright } from "@vitest/browser-playwright";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	test: {
		// Tests run in a real browser (headless Chromium via Playwright), so
		// <dialog>, focus, layout, colour and IndexedDB are the real thing.
		browser: {
			enabled: true,
			provider: playwright(),
			headless: true,
			// Otherwise a failing test writes a screenshot into the source tree.
			screenshotFailures: false,
			instances: [{ browser: "chromium" }],
		},
		setupFiles: ["./src/test/setup.ts"],
	},
});
