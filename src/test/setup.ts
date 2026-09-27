import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { savedTextsDb } from "../features/savedItems/db";

// Accessibility checks use axe-core directly via ./a11y.ts's expectNoA11yViolations,
// not vitest-axe: see that file's comment for why (a real Vitest 5 type
// incompatibility, not a runtime one).

// Testing Library's own auto-cleanup only registers itself when `afterEach` is a
// global, and this project runs Vitest without globals enabled, so it never
// fires on its own. Without this, a second `render()` in the same test file
// leaves the first render's DOM in place.
afterEach(() => {
	cleanup();
});

afterEach(async () => {
	await savedTextsDb.savedTexts.clear();
});
