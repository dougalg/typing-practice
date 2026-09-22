import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import "vitest-axe/extend-expect";
import { afterEach, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";
import { savedTextsDb } from "../features/savedItems/db";

expect.extend(axeMatchers);

afterEach(async () => {
	await savedTextsDb.savedTexts.clear();
});
