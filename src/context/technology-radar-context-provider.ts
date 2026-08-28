import { ContextProvider, RetrievedContext } from "./context-retrieval-gate";
import { TECHNOLOGY_RADAR_B11 } from "../technology/technology-radar.registry";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const technologyRadarContextProvider: ContextProvider = {
  async retrieve(input): Promise<RetrievedContext> {
    const terms = normalize(input.query).split(/\s+/).filter(term => term.length >= 3);
    const matches = TECHNOLOGY_RADAR_B11.filter(candidate => {
      const haystack = normalize(`${candidate.name} ${candidate.function} ${candidate.notes}`);
      return terms.some(term => haystack.includes(term));
    });
    return {
      projectId: input.projectId,
      query: input.query,
      facts: matches.map(candidate => `${candidate.name}: ${candidate.function}. Estado: ${candidate.state}. ${candidate.notes}`),
      citations: matches.map(candidate => ({ sourceId: "AUREA_DOCUMENTO_MAESTRO_B11", title: `Technology Radar B11 — ${candidate.name}`, version: 1, excerpt: candidate.evidence })),
    };
  },
};
