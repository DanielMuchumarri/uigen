import { renderHook, act } from "@testing-library/react";
import { test, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInAction = vi.fn();
const mockSignUpAction = vi.fn();

vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignInAction(...args),
  signUp: (...args: unknown[]) => mockSignUpAction(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();

vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();

vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

import { useAuth } from "../use-auth";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
});

test("isLoading starts as false", () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.isLoading).toBe(false);
});

test("signIn sets isLoading to true during execution and false after", async () => {
  let resolveSignIn!: (value: { success: boolean }) => void;
  mockSignInAction.mockReturnValue(
    new Promise((res) => { resolveSignIn = res; })
  );
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "p1" });

  const { result } = renderHook(() => useAuth());

  let signInPromise: Promise<unknown>;
  act(() => {
    signInPromise = result.current.signIn("a@b.com", "pass");
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveSignIn({ success: false });
    await signInPromise;
  });

  expect(result.current.isLoading).toBe(false);
});

test("signIn returns the result from the action", async () => {
  mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });

  const { result } = renderHook(() => useAuth());
  let returned: unknown;
  await act(async () => {
    returned = await result.current.signIn("a@b.com", "wrong");
  });

  expect(returned).toEqual({ success: false, error: "Invalid credentials" });
});

test("signIn on success with anon work creates project with that data and navigates", async () => {
  const anonWork = {
    messages: [{ role: "user", content: "hello" }],
    fileSystemData: { "/App.jsx": "export default () => <div/>" },
  };
  mockGetAnonWorkData.mockReturnValue(anonWork);
  mockSignInAction.mockResolvedValue({ success: true });
  mockCreateProject.mockResolvedValue({ id: "anon-project" });

  const { result } = renderHook(() => useAuth());
  await act(async () => {
    await result.current.signIn("a@b.com", "pass");
  });

  expect(mockCreateProject).toHaveBeenCalledWith({
    name: expect.stringMatching(/^Design from /),
    messages: anonWork.messages,
    data: anonWork.fileSystemData,
  });
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/anon-project");
  expect(mockGetProjects).not.toHaveBeenCalled();
});

test("signIn on success without anon work navigates to most recent existing project", async () => {
  mockGetAnonWorkData.mockReturnValue(null);
  mockSignInAction.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([{ id: "existing-1" }, { id: "existing-2" }]);

  const { result } = renderHook(() => useAuth());
  await act(async () => {
    await result.current.signIn("a@b.com", "pass");
  });

  expect(mockCreateProject).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/existing-1");
});

test("signIn on success with no projects and no anon work creates a new project and navigates", async () => {
  mockGetAnonWorkData.mockReturnValue(null);
  mockSignInAction.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "new-project" });

  const { result } = renderHook(() => useAuth());
  await act(async () => {
    await result.current.signIn("a@b.com", "pass");
  });

  expect(mockCreateProject).toHaveBeenCalledWith({
    name: expect.stringMatching(/^New Design #/),
    messages: [],
    data: {},
  });
  expect(mockPush).toHaveBeenCalledWith("/new-project");
});

test("signIn on failure does not navigate", async () => {
  mockSignInAction.mockResolvedValue({ success: false, error: "Bad credentials" });

  const { result } = renderHook(() => useAuth());
  await act(async () => {
    await result.current.signIn("a@b.com", "wrong");
  });

  expect(mockPush).not.toHaveBeenCalled();
  expect(mockCreateProject).not.toHaveBeenCalled();
});

test("anon work with empty messages array is treated as no anon work", async () => {
  mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
  mockSignInAction.mockResolvedValue({ success: true });
  mockGetProjects.mockResolvedValue([{ id: "proj-99" }]);

  const { result } = renderHook(() => useAuth());
  await act(async () => {
    await result.current.signIn("a@b.com", "pass");
  });

  expect(mockCreateProject).not.toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/proj-99");
});

test("signUp on success with anon work creates project and navigates", async () => {
  const anonWork = {
    messages: [{ role: "user", content: "hi" }],
    fileSystemData: { "/App.jsx": "export default () => null" },
  };
  mockGetAnonWorkData.mockReturnValue(anonWork);
  mockSignUpAction.mockResolvedValue({ success: true });
  mockCreateProject.mockResolvedValue({ id: "signup-project" });

  const { result } = renderHook(() => useAuth());
  await act(async () => {
    await result.current.signUp("new@user.com", "pass");
  });

  expect(mockCreateProject).toHaveBeenCalledWith({
    name: expect.stringMatching(/^Design from /),
    messages: anonWork.messages,
    data: anonWork.fileSystemData,
  });
  expect(mockClearAnonWork).toHaveBeenCalled();
  expect(mockPush).toHaveBeenCalledWith("/signup-project");
});

test("signUp on failure returns result and does not navigate", async () => {
  mockSignUpAction.mockResolvedValue({ success: false, error: "Email taken" });

  const { result } = renderHook(() => useAuth());
  let returned: unknown;
  await act(async () => {
    returned = await result.current.signUp("taken@user.com", "pass");
  });

  expect(returned).toEqual({ success: false, error: "Email taken" });
  expect(mockPush).not.toHaveBeenCalled();
});

test("signUp sets isLoading true during execution and false after", async () => {
  let resolveSignUp!: (value: { success: boolean }) => void;
  mockSignUpAction.mockReturnValue(
    new Promise((res) => { resolveSignUp = res; })
  );
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "p2" });

  const { result } = renderHook(() => useAuth());

  let signUpPromise: Promise<unknown>;
  act(() => {
    signUpPromise = result.current.signUp("new@user.com", "pass");
  });

  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    resolveSignUp({ success: false });
    await signUpPromise;
  });

  expect(result.current.isLoading).toBe(false);
});
