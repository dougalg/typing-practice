import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
	it("defaults to type=button so it never submits a surrounding form", () => {
		render(<Button>Save</Button>);

		expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
			"type",
			"button",
		);
	});

	it("keeps decorative icons out of the accessible name", () => {
		render(
			<Button variant="primary">
				Start practice
				<span aria-hidden="true">→</span>
			</Button>,
		);

		expect(
			screen.getByRole("button", { name: "Start practice" }),
		).toBeInTheDocument();
	});

	it("is announced as disabled when disabled", () => {
		render(<Button disabled>Load</Button>);

		expect(screen.getByRole("button", { name: "Load" })).toBeDisabled();
	});
});
