import { vi } from "vitest";

// server-only is a Next.js guard that throws outside RSC — neutralize it in tests
vi.mock("server-only", () => ({}));
