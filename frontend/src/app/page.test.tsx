import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("shows the project entry", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: "素材制作" })).toBeInTheDocument();
});
