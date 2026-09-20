import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading } from "./Heading";

describe("Heading", () => {
	it("renders the given level as the matching heading tag", () => {
		render(<Heading level={2}>Section title</Heading>);

		const heading = screen.getByRole("heading", { level: 2, name: "Section title" });
		expect(heading.tagName).toBe("H2");
	});

	it("merges a custom className with the level's default styles", () => {
		render(
			<Heading level={1} className="custom-class">
				Title
			</Heading>,
		);

		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveClass("custom-class");
		expect(heading.className).toContain("text-[2.2rem]");
	});
});
