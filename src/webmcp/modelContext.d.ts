interface WebMCPAnnotations {
  readOnlyHint?: boolean;
  untrustedContentHint?: boolean;
  destructiveHint?: boolean;
}

interface WebMCPToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations?: WebMCPAnnotations;
  execute: (
    input: Record<string, unknown>,
    context: { signal: AbortSignal },
  ) => unknown | Promise<unknown>;
}

interface WebMCPModelContext {
  registerTool(
    tool: WebMCPToolDefinition,
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
  getTools(): Promise<Array<{ name: string; description: string }>>;
}

interface Document {
  modelContext?: WebMCPModelContext;
}
