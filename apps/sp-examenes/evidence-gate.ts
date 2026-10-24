const SPECIFIC_RULE_MISSING = /(?:no se encontr[oó]|no pude verificar|no fue posible verificar|no se pudo verificar|no hay|no aparece|no consta).{0,140}(?:art[ií]culo|numeral|disposici[oó]n|regla|norma|criterio|clasifi|espec[ií]fic|literal)|(?:art[ií]culo|disposici[oó]n|regla|norma|criterio).{0,140}(?:no se encontr[oó]|no pude verificar|no fue posible verificar|no se pudo verificar|no consta)/is;

const CLASSIFICATION_ASSERTION = /\b(?:se clasifica como|es|resulta|ser[ií]a|se considera|constituye|es un error)\b.{0,100}\b(?:subsanable|insubsanable|subsanaci[oó]n|causal de rechazo)\b/i;

export function enforceEvidenceGate(answer: string): string {
  const proposed = answer.split(/Fundamento verificable\s*:/i)[0] || answer;
  const unverifiedIndex = answer.search(/Qu[eé] no se pudo verificar\s*:/i);
  const unverified = unverifiedIndex >= 0 ? answer.slice(unverifiedIndex) : "";
  if (!SPECIFIC_RULE_MISSING.test(unverified) || !CLASSIFICATION_ASSERTION.test(proposed)) {
    return answer;
  }

  const sourcesMatch = answer.match(/Fuentes oficiales\s*:[\s\S]*?(?=Qu[eé] no se pudo verificar\s*:|Confianza\s*:|$)/i);
  const sources = sourcesMatch?.[0]?.trim() || "Fuentes oficiales:\nSe consultaron fuentes oficiales, pero no se verificó una disposición específica aplicable al supuesto.";
  const missing = unverified.match(/Qu[eé] no se pudo verificar\s*:[\s\S]*?(?=Confianza\s*:|$)/i)?.[0]?.replace(/^Qu[eé] no se pudo verificar\s*:/i, "").trim()
    || "No se encontró una disposición oficial específica que resuelva el supuesto.";
  return [
    "Respuesta propuesta:\nNO CONCLUYENTE — no pude verificar la disposición exacta en el contenido oficial consultado.",
    "Fundamento verificable:\nEl contenido oficial recuperado no permite confirmar si la omisión es subsanable o insubsanable. No debe emitirse una clasificación definitiva sin identificar la regla aplicable y comprobar los requisitos del procedimiento.",
    sources,
    "Qué no se pudo verificar:\n" + missing,
    "Confianza: baja"
  ].join("\n\n");
}
