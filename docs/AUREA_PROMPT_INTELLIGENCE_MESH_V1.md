# AUREA Prompt Intelligence Mesh V1

## Purpose
Convert a user's natural-language intent into provider-optimized instructions, without exposing provider complexity to the user.

## Core rule
**Intent → Task Specification → Prompt Compilation → Provider Routing → Execution → QA → Refinement → Learning.**

English is a selectable strategy, not a universal rule. The compiler chooses SOURCE, ENGLISH, PROVIDER_NATIVE or BILINGUAL according to modality, provider and language requirements. Any future empirical benchmark may change these routing rules.

## Prompt contracts
### Research
Role, objective, context, central question, subquestions, scope, source requirements, evidence criteria, freshness, constraints, deliverable, format, uncertainty and quality gates.

### Image
Subject, scene, composition, camera, lighting, materials, mood, realism, brand, text, aspect ratio and negative constraints.

### Video
Objective, audience, duration, aspect ratio, scene sequence, shot design, camera movement, action, location, lighting, transitions, pacing, narration, voice, music, ambience, SFX, text overlays, CTA, factual constraints and negative constraints.

### Audio
Purpose, language, accent, voice profile, emotion, energy, speed, pauses, pronunciation, intonation, emphasis, background, music, SFX, duration and script.

## Quality policy
- Facts, inferences and assumptions must remain distinguishable.
- Missing information must not be fabricated.
- Public/commercial claims must come from current approved sources.
- Provider disagreement is not resolved by voting; it triggers evidence review.
- A provider being registered does not mean it is connected or available.
- Every execution should record provider, model, prompt version, cost, latency, QA and evidence when the runtime supports telemetry.

## Next integration targets
1. Connect compiler output to ProviderRouter.
2. Add prompt-version telemetry to Task Graph.
3. Add provider-specific adapters and fallback policy.
4. Benchmark language strategies by task/provider instead of assuming English.
5. Add Prompt QA as a pre-execution and post-result gate.
