export type PracticePhase = "preparatoria" | "precontractual" | "general";

export function normalizePracticePhase(value: unknown): PracticePhase | null {
  if (value === undefined || value === null || value === "") return "general";
  if (value === "preparatoria" || value === "precontractual" || value === "general") return value;
  return null;
}

export function getPracticePhaseGuidance(phase: PracticePhase): string {
  if (phase === "preparatoria") {
    return "ENFOQUE DE PRÁCTICA: FASE PREPARATORIA. Prioriza la planificación, necesidad institucional, estudios, presupuesto, PAC, determinación del objeto, especificaciones o términos de referencia y demás actuaciones preparatorias que correspondan al supuesto. No fuerces una respuesta si la pregunta pertenece a otra fase.";
  }
  if (phase === "precontractual") {
    return "ENFOQUE DE PRÁCTICA: FASE PRECONTRACTUAL. Prioriza convocatoria, preguntas y aclaraciones, presentación y convalidación de ofertas, evaluación, calificación, negociación o adjudicación, según el procedimiento y la normativa temporal aplicable. No fuerces una respuesta si la pregunta pertenece a otra fase.";
  }
  return "ENFOQUE DE PRÁCTICA: GENERAL. Identifica primero la fase y el procedimiento aplicables antes de analizar la pregunta.";
}
