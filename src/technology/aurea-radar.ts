export type RadarDisposition = "EXPLOIT" | "INTEGRATE" | "EXPERIMENT" | "WATCH" | "DISCARD";

export interface RadarEvidence {
  sourceId: string;
  sourceType: "VIDEO" | "ARTICLE" | "REPOSITORY" | "DOCUMENT" | "OTHER";
  capturedAt: string;
  claims: string[];
  verified: boolean;
}

export interface RadarOpportunity {
  id: string;
  title: string;
  category: "AGENT" | "SKILL" | "CONNECTOR" | "PROVIDER" | "MEDIA" | "EDUCATION" | "PLATFORM" | "OTHER";
  evidence: RadarEvidence[];
  reuseTargets: string[];
  disposition: RadarDisposition;
  rationale: string;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

export interface RadarReport {
  reportId: string;
  createdAt: string;
  subject: string;
  opportunities: RadarOpportunity[];
  unresolvedQuestions: string[];
}

/** Evidence-first intake: Radar may recommend, but it never silently promotes an observation to fact. */
export function validateRadarOpportunity(opportunity: RadarOpportunity): void {
  if (!opportunity.id.trim()) throw new Error("RADAR_ID_REQUIRED");
  if (!opportunity.title.trim()) throw new Error("RADAR_TITLE_REQUIRED");
  if (!opportunity.evidence.length) throw new Error("RADAR_EVIDENCE_REQUIRED");
  if (opportunity.evidence.some((evidence) => !evidence.sourceId.trim())) {
    throw new Error("RADAR_SOURCE_ID_REQUIRED");
  }
  if (!opportunity.rationale.trim()) throw new Error("RADAR_RATIONALE_REQUIRED");
}

export function buildRadarOpportunity(input: Omit<RadarOpportunity, "evidence"> & { evidence: RadarEvidence[] }): RadarOpportunity {
  const opportunity: RadarOpportunity = { ...input };
  validateRadarOpportunity(opportunity);
  return opportunity;
}
