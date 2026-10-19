/// Defines types and API for working with Antigravity hooks.

//=== Event Input Objects ===

// HookEvent defines the base input fields that are common to all event hooks.
export interface HookEvent {
  readonly conversationId: string;
  readonly workspacePaths: string[];
  readonly transcriptPath: string;
  readonly artifactDirectoryPath: string;
  readonly modelName: string;
}

// Input object for "SessionStart" event (no extra fields).
export type SessionStartEvent = HookEvent;

export interface PreInvocationEvent extends HookEvent {
  readonly invocationNum: number;
  readonly initialNumSteps: number;
}

//=== Event Input Object Validation ===

// Validate common hook event fields.
export function isHookEvent(value: unknown): value is HookEvent {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.conversationId === "string"
    && Array.isArray(candidate.workspacePaths)
    && candidate.workspacePaths.every(path => typeof path === "string")
    && typeof candidate.transcriptPath === "string"
    && typeof candidate.artifactDirectoryPath === "string"
    && typeof candidate.modelName === "string"
  );
}

export function isSessionStartEvent(value: unknown): value is SessionStartEvent {
  return isHookEvent(value);
}

export function isPreInvocationEvent(value: unknown): value is PreInvocationEvent {
  const candidate = value as Record<string, unknown>;
  if (!isHookEvent(value)) return false;

  return (
    typeof candidate.invocationNum === "number"
    && Number.isInteger(candidate.invocationNum)
    && typeof candidate.initialNumSteps === "number"
    && Number.isInteger(candidate.initialNumSteps)
  );
}

//=== Hook Response Objects ===

interface EphemeralMessageStep {
  ephemeralMessage: string;
}

interface SystemMessageContent {
  systemMessage: string;
}

interface SystemMessageStep {
  systemMessage: SystemMessageContent;
}

interface UserMessageStep {
  userMessage: string;
}

type Step = EphemeralMessageStep | SystemMessageStep | UserMessageStep;

interface InjectStepsResponse {
  injectSteps: Step[];
}

// The SessionStart and PreInvocation hooks use the same "injectSteps" response
// object type.
export type SessionStartResponse = InjectStepsResponse;
export type PreInvocationResponse = InjectStepsResponse;

//=== Response Object Constructors ===

function injectStepsResponse(steps: Step[]): InjectStepsResponse {
  return { injectSteps: steps };
}

export function sessionStartResponse(steps: Step[]): SessionStartResponse {
  return injectStepsResponse(steps) as SessionStartResponse;
}

export function preInvocationResponse(steps: Step[]): PreInvocationResponse {
  return injectStepsResponse(steps) as PreInvocationResponse;
}

export function ephemeralMessage(message: string): EphemeralMessageStep {
  return { ephemeralMessage: message };
}

export function systemMessage(message: string): SystemMessageStep {
  return { systemMessage: { systemMessage: message } };
}

export function userMessage(message: string): UserMessageStep {
  return { userMessage: message };
}

//=== Custom Error Types ===

export class HookError extends Error {
  constructor(message: string) {
    super(message);

    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      (this as any).__proto__ = actualProto;
    }
    this.name = "HookError";
  }
}
