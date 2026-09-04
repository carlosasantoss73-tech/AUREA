import type { ExecutionAdapter, ExecutionAdapterRequest, ExecutionAdapterResponse } from "./execution-runtime.js";

export interface AnthropicExecutionConfig {
  apiKey: string;
  endpoint?: string;
  maxTokens?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Production-shaped provider adapter for Anthropic Messages API.
 *
 * Credentials are supplied at runtime and are never stored in the provider
 * registry or returned as evidence. The adapter fails closed on missing
 * configuration, non-2xx responses, malformed payloads, or missing text.
 */
export class ConchitaAnthropicExecutionAdapter implements ExecutionAdapter {
  readonly providerId: string;

  private readonly endpoint: string;
  private readonly maxTokens: number;
  private readonly fetchImpl: typeof fetch;

  constructor(providerId: string, config: AnthropicExecutionConfig) {
    if (!providerId) throw new Error("ANTHROPIC_PROVIDER_ID_REQUIRED");
    if (!config.apiKey) throw new Error("ANTHROPIC_API_KEY_REQUIRED");
    this.providerId = providerId;
    this.endpoint = config.endpoint ?? "https://api.anthropic.com/v1/messages";
    this.maxTokens = config.maxTokens ?? 1024;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async execute(request: ExecutionAdapterRequest): Promise<ExecutionAdapterResponse> {
    const input = this.readInput(request.input);
    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: request.provider.modelId,
        max_tokens: this.maxTokens,
        messages: [{ role: "user", content: input.message }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      const detail = body.replace(/\s+/g, " ").slice(0, 240);
      throw new Error(`ANTHROPIC_HTTP_${response.status}${detail ? `:${detail}` : ""}`);
    }

    const payload = (await response.json()) as unknown;
    const text = this.extractText(payload);
    if (!text) throw new Error("ANTHROPIC_RESPONSE_TEXT_MISSING");

    return {
      output: text,
      evidence: [
        `PROVIDER_HTTP:anthropic`,
        `PROVIDER_MODEL:${request.provider.modelId}`,
        `TRACE:${request.traceId}`,
      ],
    };
  }

  private readonly apiKey: string;

  private readInput(input: unknown): { message: string } {
    if (!input || typeof input !== "object") throw new Error("ANTHROPIC_INPUT_INVALID");
    const message = (input as { message?: unknown }).message;
    if (typeof message !== "string" || !message.trim()) throw new Error("ANTHROPIC_MESSAGE_REQUIRED");
    return { message: message.trim() };
  }

  private extractText(payload: unknown): string | undefined {
    if (!payload || typeof payload !== "object") return undefined;
    const content = (payload as { content?: unknown }).content;
    if (!Array.isArray(content)) return undefined;
    const text = content
      .filter((item): item is { type?: unknown; text?: unknown } => !!item && typeof item === "object")
      .filter((item) => item.type === "text" && typeof item.text === "string")
      .map((item) => item.text as string)
      .join("\n")
      .trim();
    return text || undefined;
  }
}
