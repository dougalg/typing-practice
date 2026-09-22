import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import "vitest-axe/extend-expect";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import * as axeMatchers from "vitest-axe/matchers";
import { savedTextsDb } from "../features/savedItems/db";

expect.extend(axeMatchers);

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
