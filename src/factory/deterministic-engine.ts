export interface NumericSurveyRecord {
  service: string;
  answers: Record<string, number>;
}

export interface ServiceAggregate {
  service: string;
  count: number;
  averages: Record<string, number>;
}

export interface DeterministicCalculationResult {
  aggregates: ServiceAggregate[];
  excluded: Array<{ index: number; reason: string }>;
}

export class DeterministicSurveyEngine {
  calculate(
    records: NumericSurveyRecord[],
    questions: string[],
  ): DeterministicCalculationResult {
    const valid: NumericSurveyRecord[] = [];
    const excluded: Array<{ index: number; reason: string }> = [];

    records.forEach((record, index) => {
      if (!record.service) {
        excluded.push({ index, reason: "MISSING_SERVICE" });
        return;
      }
      for (const question of questions) {
        const value = record.answers[question];
        if (!Number.isFinite(value) || value < 1 || value > 5) {
          excluded.push({ index, reason: `INVALID_OR_MISSING_${question}` });
          return;
        }
      }
      valid.push(record);
    });

    const groups = new Map<string, NumericSurveyRecord[]>();
    for (const record of valid) {
      const group = groups.get(record.service) ?? [];
      group.push(record);
      groups.set(record.service, group);
    }

    const aggregates = [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([service, group]) => {
        const averages: Record<string, number> = {};
        for (const question of questions) {
          const total = group.reduce((sum, row) => sum + row.answers[question], 0);
          averages[question] = Number((total / group.length).toFixed(4));
        }
        return { service, count: group.length, averages };
      });

    return { aggregates, excluded };
  }
}
