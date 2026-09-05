import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, setToken } from "./client";

function mockResponse(body: unknown, status: number, contentType = "application/json") {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? contentType : null),
    },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as Response;
}

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("parses a successful login response", async () => {
    const token = { access_token: "tok", token_type: "bearer" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(token, 200)));
    const result = await api.login({ email: "a@b.c", password: "pw" });
    expect(result.access_token).toBe("tok");
    expect(result.token_type).toBe("bearer");
  });

  it("throws ApiError with the response detail on errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse({ detail: "Bad credentials" }, 401)));
    await expect(api.login({ email: "a@b.c", password: "wrong" })).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      detail: "Bad credentials",
    });
  });

  it("sends the stored Bearer token on authenticated requests", async () => {
    setToken("mytoken");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        mockResponse({ id: 1, email: "a@b.c", display_name: "A", role: "melder", is_active: true }, 200),
      );
    vi.stubGlobal("fetch", fetchMock);
    await api.me();
    const init = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(init.headers.Authorization).toBe("Bearer mytoken");
  });
});
