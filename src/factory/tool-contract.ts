export interface ToolContext {
  executionId: string;
  tenantId: string;
  agentId: string;
  permissions: string[];
}

export interface ToolDefinition<I, O> {
  toolId: string;
  version: string;
  description: string;
  requiredPermissions: string[];
  execute(input: I, context: ToolContext): Promise<O>;
}

export function authorizeTool(
  tool: ToolDefinition<unknown, unknown>,
  context: ToolContext,
): void {
  const missing = tool.requiredPermissions.filter(
    permission => !context.permissions.includes(permission),
  );
  if (missing.length > 0) {
    throw new Error(`TOOL_PERMISSION_DENIED:${missing.join(",")}`);
  }
}
