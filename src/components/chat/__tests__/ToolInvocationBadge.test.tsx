import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { getToolLabel, ToolInvocationBadge } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

// --- getToolLabel ---

test("str_replace_editor create", () => {
  expect(getToolLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("str_replace_editor str_replace extracts filename from nested path", () => {
  expect(getToolLabel("str_replace_editor", { command: "str_replace", path: "/src/components/Card.tsx" })).toBe("Editing Card.tsx");
});

test("str_replace_editor insert", () => {
  expect(getToolLabel("str_replace_editor", { command: "insert", path: "/src/utils.ts" })).toBe("Editing utils.ts");
});

test("str_replace_editor view", () => {
  expect(getToolLabel("str_replace_editor", { command: "view", path: "/src/index.ts" })).toBe("Viewing index.ts");
});

test("str_replace_editor undo_edit", () => {
  expect(getToolLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Undoing edit in App.jsx");
});

test("str_replace_editor unknown command falls back to Editing", () => {
  expect(getToolLabel("str_replace_editor", { command: "unknown", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("str_replace_editor with no path gracefully degrades", () => {
  expect(getToolLabel("str_replace_editor", {})).toBe("Editing file...");
});

test("file_manager rename", () => {
  expect(getToolLabel("file_manager", { command: "rename", path: "/Button.tsx" })).toBe("Renaming Button.tsx");
});

test("file_manager delete", () => {
  expect(getToolLabel("file_manager", { command: "delete", path: "/Card.tsx" })).toBe("Deleting Card.tsx");
});

test("file_manager with no path gracefully degrades", () => {
  expect(getToolLabel("file_manager", {})).toBe("Managing file...");
});

test("unknown tool returns raw tool name", () => {
  expect(getToolLabel("my_custom_tool", { path: "/App.jsx" })).toBe("my_custom_tool");
});

// --- ToolInvocationBadge rendering ---

test("shows spinner in pending (call) state", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
      }}
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "call",
        toolCallId: "2",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
      }}
    />
  );
  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

test("shows green dot in result state", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "result",
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("renders without crashing in partial-call state with no path", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={{
        state: "partial-call",
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: {},
      }}
    />
  );

  expect(screen.getByText("Editing file...")).toBeDefined();
});
