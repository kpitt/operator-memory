import { describe, expect, it } from "vitest";
import { type HookEvent, isHookEvent } from "../src/types";

describe("isHookEvent", () => {
  const validEvent: HookEvent = {
    conversationId: "conv-123",
    workspacePaths: ["/workspace/one", "/workspace/two"],
    transcriptPath: "/path/to/transcript.jsonl",
    artifactDirectoryPath: "/path/to/artifacts",
    modelName: "gemini-3.8-flash",
  };

  it("returns true for a valid HookEvent", () => {
    expect(isHookEvent(validEvent)).toBe(true);
  });

  it("returns true when workspacePaths is an empty array", () => {
    expect(isHookEvent({ ...validEvent, workspacePaths: [] })).toBe(true);
  });

  it("returns true when additional fields are present", () => {
    expect(isHookEvent({ ...validEvent, extraField: "allowed" })).toBe(true);
  });

  it("returns false for non-object values", () => {
    expect(isHookEvent(null)).toBe(false);
    expect(isHookEvent(undefined)).toBe(false);
    expect(isHookEvent("string")).toBe(false);
    expect(isHookEvent(123)).toBe(false);
    expect(isHookEvent(true)).toBe(false);
    expect(isHookEvent(Symbol("hook"))).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isHookEvent([])).toBe(false);
    expect(isHookEvent([validEvent])).toBe(false);
  });

  it("returns false when required fields are missing", () => {
    const { conversationId, ...missingConversationId } = validEvent;
    const { workspacePaths, ...missingWorkspacePaths } = validEvent;
    const { transcriptPath, ...missingTranscriptPath } = validEvent;
    const { artifactDirectoryPath, ...missingArtifactDirectoryPath } = validEvent;
    const { modelName, ...missingModelName } = validEvent;

    expect(isHookEvent(missingConversationId)).toBe(false);
    expect(isHookEvent(missingWorkspacePaths)).toBe(false);
    expect(isHookEvent(missingTranscriptPath)).toBe(false);
    expect(isHookEvent(missingArtifactDirectoryPath)).toBe(false);
    expect(isHookEvent(missingModelName)).toBe(false);
  });

  it("returns false when field types are invalid", () => {
    expect(isHookEvent({ ...validEvent, conversationId: 123 })).toBe(false);
    expect(isHookEvent({ ...validEvent, workspacePaths: "not-an-array" })).toBe(false);
    expect(isHookEvent({ ...validEvent, workspacePaths: [123, 456] })).toBe(false);
    expect(isHookEvent({ ...validEvent, workspacePaths: ["/valid", null] })).toBe(false);
    expect(isHookEvent({ ...validEvent, transcriptPath: false })).toBe(false);
    expect(isHookEvent({ ...validEvent, artifactDirectoryPath: null })).toBe(false);
    expect(isHookEvent({ ...validEvent, modelName: { name: "model" } })).toBe(false);
  });
});
