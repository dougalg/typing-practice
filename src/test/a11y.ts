import axe from "axe-core";

/**
 * Runs axe-core against a rendered container and asserts zero violations.
 *
 * vitest-axe (the usual Vitest + axe-core pairing) was tried first (per
 * specs/001-practice-history/research.md R8) but its type augmentation uses
 * the pre-Vitest-5 `declare global { namespace Vi { interface Assertion ... } }`
 * pattern. Vitest 5's own `Assertion` interface is augmented via
 * `declare module "vitest"` instead (confirmed against
 * @testing-library/jest-dom, which does work), so vitest-axe's
 * `toHaveNoViolations()` matcher never appears on the real `expect()` return
 * type — a real `tsc` failure, not a runtime one. Calling axe-core directly
 * with a plain assertion avoids the type augmentation entirely.
 */
export async function expectNoA11yViolations(
	container: Element,
): Promise<void> {
	const results = await axe.run(container);
	if (results.violations.length > 0) {
		const summary = results.violations
			.map((v) => `- ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
			.join("\n");
		throw new Error(
			`Expected no accessibility violations, found ${results.violations.length}:\n${summary}`,
		);
	}
}
