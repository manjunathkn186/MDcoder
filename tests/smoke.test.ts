import { describe, expect, it } from "vitest";
import { cn } from "../src/lib/cn";

describe("cn()", () => {
  it("concatenates truthy classes", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
});
