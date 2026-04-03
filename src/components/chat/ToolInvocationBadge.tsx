"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

export function getToolLabel(toolName: string, args: Record<string, unknown>): string {
  const path = args?.path;
  const filename = typeof path === "string" ? path.split("/").pop() || path : undefined;

  if (toolName === "str_replace_editor") {
    if (!filename) return "Editing file...";
    switch (args.command) {
      case "create": return `Creating ${filename}`;
      case "str_replace":
      case "insert": return `Editing ${filename}`;
      case "view": return `Viewing ${filename}`;
      case "undo_edit": return `Undoing edit in ${filename}`;
      default: return `Editing ${filename}`;
    }
  }

  if (toolName === "file_manager") {
    if (!filename) return "Managing file...";
    switch (args.command) {
      case "rename": return `Renaming ${filename}`;
      case "delete": return `Deleting ${filename}`;
      default: return toolName;
    }
  }

  return toolName;
}

interface ToolInvocationBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolInvocationBadge({ toolInvocation }: ToolInvocationBadgeProps) {
  const label = getToolLabel(
    toolInvocation.toolName,
    toolInvocation.args as Record<string, unknown>
  );
  const isDone =
    toolInvocation.state === "result" &&
    (toolInvocation as { result?: unknown }).result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-neutral-700">{label}</span>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <span className="text-neutral-700">{label}</span>
        </>
      )}
    </div>
  );
}
