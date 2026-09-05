/**
 * AUREA HYPERVELOCITY Mesh Watchdog.
 *
 * The watchdog does not inspect hidden model reasoning. It observes explicit
 * operational pulses and detects process drift: repeated no-progress turns or
 * significant execution decay versus the cycle baseline.
 */

export interface HypervelocityWorkPulse {
  cycleId: string;
  interaction: number;
  objective: string;
  toolActions: number;
  codeActions: number;
  decisions: number;
  artifactsProduced: number;
  evidenceProduced: number;
  cellsClosed: number;
  blockers: number;
  nextActionDefined: boolean;
}

export type HypervelocityWatchdogStatus = "HEALTHY" | "DRIFT" | "BLOCKED_EXTERNAL";

export interface HypervelocityWatchdogDecision {
  status: HypervelocityWatchdogStatus;
  score: number;
  baselineScore: number;
  consecutiveNoProgress: number;
  reasons: string[];
  directive: string;
}

export interface HypervelocityWatchdogConfig {
  maxNoProgressInteractions?: number;
  decayRatio?: number;
}

const DEFAULT_MAX_NO_PROGRESS = 2;
const DEFAULT_DECAY_RATIO = 0.5;

export class HypervelocityMeshWatchdog {
  private readonly maxNoProgress: number;
  private readonly decayRatio: number;
  private baselineScore: number | undefined;
  private consecutiveNoProgress = 0;

  constructor(config: HypervelocityWatchdogConfig = {}) {
    this.maxNoProgress = config.maxNoProgressInteractions ?? DEFAULT_MAX_NO_PROGRESS;
    this.decayRatio = config.decayRatio ?? DEFAULT_DECAY_RATIO;
  }

  observe(pulse: HypervelocityWorkPulse): HypervelocityWatchdogDecision {
    const score = scorePulse(pulse);
    if (this.baselineScore === undefined && score > 0) {
      this.baselineScore = score;
    }

    const progress = hasProgress(pulse);
    this.consecutiveNoProgress = progress ? 0 : this.consecutiveNoProgress + 1;

    const reasons: string[] = [];
    if (this.consecutiveNoProgress >= this.maxNoProgress) {
      reasons.push("NO_PROGRESS_INTERACTIONS_EXCEEDED");
    }
    if (
      this.baselineScore !== undefined &&
      this.baselineScore > 0 &&
      score < this.baselineScore * this.decayRatio
    ) {
      reasons.push("EXECUTION_SCORE_DECAY");
    }
    if (pulse.blockers > 0 && !pulse.nextActionDefined) {
      reasons.push("BLOCKER_WITHOUT_RECOVERY_ACTION");
    }

    if (pulse.blockers > 0 && !pulse.nextActionDefined) {
      return {
        status: "BLOCKED_EXTERNAL",
        score,
        baselineScore: this.baselineScore ?? score,
        consecutiveNoProgress: this.consecutiveNoProgress,
        reasons,
        directive: "DECLARE_BLOCKED_EXTERNAL_WITH_EXACT_DEPENDENCY_AND_EVIDENCE",
      };
    }

    if (reasons.length === 0) {
      return {
        status: "HEALTHY",
        score,
        baselineScore: this.baselineScore ?? score,
        consecutiveNoProgress: this.consecutiveNoProgress,
        reasons: [],
        directive: "CONTINUE_EXECUTION",
      };
    }

    return {
      status: "DRIFT",
      score,
      baselineScore: this.baselineScore ?? score,
      consecutiveNoProgress: this.consecutiveNoProgress,
      reasons,
      directive: "RETAKE_CONTROL:INSPECT_STATE_EXECUTE_WORK_VERIFY_EVIDENCE_CLOSE_OR_BLOCK",
    };
  }
}

function scorePulse(pulse: HypervelocityWorkPulse): number {
  return (
    pulse.toolActions +
    pulse.codeActions +
    pulse.decisions +
    pulse.artifactsProduced * 2 +
    pulse.evidenceProduced * 2 +
    pulse.cellsClosed * 3 +
    (pulse.nextActionDefined ? 1 : 0)
  );
}

function hasProgress(pulse: HypervelocityWorkPulse): boolean {
  return (
    pulse.toolActions > 0 ||
    pulse.codeActions > 0 ||
    pulse.decisions > 0 ||
    pulse.artifactsProduced > 0 ||
    pulse.evidenceProduced > 0 ||
    pulse.cellsClosed > 0
  );
}
