import { describe, it, expect } from "vitest";
import { ConfigError } from "../../lib/errors";

describe("ConfigError", () => {
  it("has statusCode 503", () => {
    const err = new ConfigError("something broke");
    expect(err.statusCode).toBe(503);
  });

  it("sets userMessage", () => {
    const err = new ConfigError("friendly message");
    expect(err.userMessage).toBe("friendly message");
    expect(err.message).toBe("friendly message");
  });

  it("sets name to ConfigError", () => {
    expect(new ConfigError("x").name).toBe("ConfigError");
  });

  it("attaches cause when provided", () => {
    const cause = new Error("root cause");
    const err = new ConfigError("wrapper", cause);
    expect(err.cause).toBe(cause);
  });

  it("is an instance of Error", () => {
    expect(new ConfigError("x")).toBeInstanceOf(Error);
  });
});
