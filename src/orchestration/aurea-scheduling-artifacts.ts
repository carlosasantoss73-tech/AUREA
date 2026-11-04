export type ScheduleStatus = "DRAFT" | "APPROVED" | "ACTIVE" | "PAUSED" | "RETIRED";

export interface AureaSchedule {
  id: string;
  planId: string;
  status: ScheduleStatus;
  timezone: string;
  cadence: string;
  nextRunAt?: string;
}

export interface AureaArtifact<T = unknown> {
  id: string;
  planId: string;
  type: "REPORT" | "MEDIA" | "DATA" | "LOG";
  createdAt: string;
  sourceIds: string[];
  content: T;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSchedule(schedule: AureaSchedule): ValidationResult {
  const errors: string[] = [];
  if (!schedule.id.trim()) errors.push("SCHEDULE_ID_REQUIRED");
  if (!schedule.planId.trim()) errors.push("PLAN_ID_REQUIRED");
  if (!schedule.timezone.trim()) errors.push("TIMEZONE_REQUIRED");
  if (!schedule.cadence.trim()) errors.push("CADENCE_REQUIRED");
  return { valid: errors.length === 0, errors, warnings: [] };
}

export function validateArtifact(artifact: AureaArtifact): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!artifact.id.trim()) errors.push("ARTIFACT_ID_REQUIRED");
  if (!artifact.planId.trim()) errors.push("PLAN_ID_REQUIRED");
  if (!artifact.sourceIds.length) warnings.push("ARTIFACT_HAS_NO_SOURCE_IDS");
  return { valid: errors.length === 0, errors, warnings };
}
