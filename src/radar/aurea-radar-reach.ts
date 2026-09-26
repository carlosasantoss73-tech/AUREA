export type RadarSourceKind = "WEB" | "GITHUB" | "YOUTUBE" | "REDDIT" | "SOCIAL" | "DOC";
export type EvidenceState = "CAPTURED" | "VERIFIED" | "REJECTED";

export interface RadarReachRequest {
  query: string;
  sources: RadarSourceKind[];
  maxItemsPerSource?: number;
}

export interface RadarEvidence {
  source: RadarSourceKind;
  sourceId: string;
  capturedAt: string;
  title: string;
  uri: string;
  observedClaims: string[];
  state: EvidenceState;
}

export interface RadarReachAdapter {
  readonly id: string;
  readonly source: RadarSourceKind;
  discover(request: RadarReachRequest): Promise<RadarEvidence[]>;
}

/**
 * Evidence-first boundary for Radar Reach.
 * Adapters discover evidence; they never activate capabilities or change AUREA state.
 */
export interface RadarReachGateway {
  discover(request: RadarReachRequest): Promise<RadarEvidence[]>;
}

export function validateRadarReachRequest(request: RadarReachRequest): void {
  if (!request.query.trim()) throw new Error("RADAR_QUERY_REQUIRED");
  if (!request.sources.length) throw new Error("RADAR_SOURCE_REQUIRED");
  if (request.maxItemsPerSource !== undefined && request.maxItemsPerSource < 1) {
    throw new Error("RADAR_MAX_ITEMS_INVALID");
  }
}

export class GovernedRadarReachGateway implements RadarReachGateway {
  constructor(private readonly adapters: RadarReachAdapter[]) {}

  async discover(request: RadarReachRequest): Promise<RadarEvidence[]> {
    validateRadarReachRequest(request);
    const selected = this.adapters.filter((adapter) => request.sources.includes(adapter.source));
    const results = await Promise.all(selected.map((adapter) => adapter.discover(request)));
    return results.flat().map((evidence) => ({ ...evidence, state: "CAPTURED" }));
  }
}
