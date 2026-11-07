import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePeopleLoad } from "./use-people";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("@corely/web-shared/lib/auth-provider", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@corely/web-shared/shared/lib/permissions", () => ({
  useEffectivePermissions: () => ({}),
  hasPermission: () => false,
}));
describe("Mounted People response isolation", () => {
  it("discards late private results when workspace/role projection changes", async () => {
    let complete: (data: string) => void = () => undefined;
    const old = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          complete = resolve;
        })
    );
    const next = vi.fn(async () => "neutral workspace B");
    const { result, rerender } = renderHook(({ scope, load }) => usePeopleLoad(load, scope), {
      initialProps: { scope: "tenant-a:workspace-a:private", load: old },
    });
    rerender({ scope: "tenant-b:workspace-b:neutral", load: next });
    await waitFor(() => expect(result.current.data).toBe("neutral workspace B"));
    await act(async () => {
      complete("private workspace A");
    });
    expect(result.current.data).toBe("neutral workspace B");
  });
  it("clears previously retrieved fields on reload and failed reauthorization", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce("private details")
      .mockRejectedValueOnce(new Error("403"));
    const { result } = renderHook(() => usePeopleLoad(load, "same scope"));
    await waitFor(() => expect(result.current.data).toBe("private details"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
  it("does not retrieve fields before authorization", () => {
    const load = vi.fn(async () => "private");
    renderHook(() => usePeopleLoad(load, "scope", false));
    expect(load).not.toHaveBeenCalled();
  });
});
