// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const { mockCookieGet } = vi.hoisted(() => ({
  mockCookieGet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: mockCookieGet }),
}));

import { getSession } from "../auth";

const TEST_SECRET = new TextEncoder().encode("development-secret-key");

async function makeToken(
  payload: Record<string, unknown>,
  expiresIn: string = "7d",
  secret = TEST_SECRET
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(secret);
}

beforeEach(() => {
  vi.clearAllMocks();
});

test("returns null when auth-token cookie is absent", async () => {
  mockCookieGet.mockReturnValue(undefined);
  expect(await getSession()).toBeNull();
});

test("returns null when token is malformed", async () => {
  mockCookieGet.mockReturnValue({ value: "not.a.valid.jwt" });
  expect(await getSession()).toBeNull();
});

test("returns null when token is expired", async () => {
  const token = await makeToken(
    { userId: "1", email: "a@b.com", expiresAt: new Date().toISOString() },
    "-1s"
  );
  mockCookieGet.mockReturnValue({ value: token });
  expect(await getSession()).toBeNull();
});

test("returns null when token was signed with a different secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await makeToken(
    { userId: "1", email: "a@b.com", expiresAt: new Date().toISOString() },
    "7d",
    wrongSecret
  );
  mockCookieGet.mockReturnValue({ value: token });
  expect(await getSession()).toBeNull();
});

test("returns session payload for a valid token", async () => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const token = await makeToken({ userId: "user-123", email: "test@example.com", expiresAt });
  mockCookieGet.mockReturnValue({ value: token });

  const session = await getSession();

  expect(session).not.toBeNull();
  expect(session?.userId).toBe("user-123");
  expect(session?.email).toBe("test@example.com");
});
