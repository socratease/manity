/**
 * Tool Registry
 *
 * Manages tool registration, lookup, and schema validation.
 */

import type {
  ToolDefinition,
  ToolName,
  ToolInput,
  ToolInputSchema,
  ToolMetadata,
} from './types';

/**
 * Validates an input object against a tool's input schema.
 * Returns an array of validation errors (empty if valid).
 */
export function validateToolInput(
  input: ToolInput,
  schema: ToolInputSchema
): string[] {
  const errors: string[] = [];

  if (typeof input !== 'object' || input === null) {
    return ['Input must be an object'];
  }

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in input) || (input as Record<string, unknown>)[field] === undefined) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Validate field types
  for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
    const value = (input as Record<string, unknown>)[fieldName];

    if (value === undefined || value === null) {
      continue; // Skip optional/missing fields
    }

    // Type validation
    switch (fieldSchema.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Field ${fieldName} must be a string, got ${typeof value}`);
        } else if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
          errors.push(`Field ${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          errors.push(`Field ${fieldName} must be a number, got ${typeof value}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field ${fieldName} must be a boolean, got ${typeof value}`);
        }
        break;
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Field ${fieldName} must be an array, got ${typeof value}`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`Field ${fieldName} must be an object, got ${typeof value}`);
        }
        break;
    }
  }

  return errors;
}

/**
 * Tool Registry class
 *
 * Manages registration and lookup of tools with metadata and schema validation.
 */
export class ToolRegistry {
  private tools: Map<ToolName, ToolDefinition> = new Map();

  /**
   * Register a tool definition.
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Register multiple tools at once.
   */
  registerAll(tools: ToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * Get a tool by name.
   */
  get(name: ToolName): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered.
   */
  has(name: ToolName): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tool names.
   */
  getNames(): ToolName[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get all registered tools.
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools matching certain metadata criteria.
   */
  getByMetadata(filter: Partial<ToolMetadata>): ToolDefinition[] {
    return this.getAll().filter(tool => {
      for (const [key, value] of Object.entries(filter)) {
        const metaKey = key as keyof ToolMetadata;
        if (metaKey === 'tags') {
          // For tags, check if any match
          const filterTags = value as string[];
          if (!filterTags.some(tag => tool.metadata.tags.includes(tag))) {
            return false;
          }
        } else if (tool.metadata[metaKey] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Get tools that are safe to auto-execute (no side effects, no confirmation needed).
   */
  getSafeTools(): ToolDefinition[] {
    return this.getAll().filter(
      tool => !tool.metadata.sideEffecting && !tool.metadata.requiresConfirmation
    );
  }

  /**
   * Get tools that require confirmation.
   */
  getConfirmationRequiredTools(): ToolDefinition[] {
    return this.getAll().filter(tool => tool.metadata.requiresConfirmation);
  }

  /**
   * Get read-only tools (useful for planning/observation steps).
   */
  getReadOnlyTools(): ToolDefinition[] {
    return this.getAll().filter(
      tool => tool.metadata.readsState && !tool.metadata.mutatesState
    );
  }

  /**
   * Get state-mutating tools.
   */
  getMutatingTools(): ToolDefinition[] {
    return this.getAll().filter(tool => tool.metadata.mutatesState);
  }

  /**
   * Validate input for a specific tool.
   * Returns validation errors or empty array if valid.
   */
  validateInput(toolName: ToolName, input: ToolInput): string[] {
    const tool = this.get(toolName);
    if (!tool) {
      return [`Unknown tool: ${toolName}`];
    }
    return validateToolInput(input, tool.inputSchema);
  }

  /**
   * Get tool definitions formatted for LLM prompting.
   * Returns a description of available tools and their schemas.
   */
  getToolDescriptionsForPrompt(): string {
    const tools = this.getAll();
    return tools
      .map(tool => {
        const requiredFields = tool.inputSchema.required || [];
        const properties = Object.entries(tool.inputSchema.properties)
          .map(([name, prop]) => {
            const required = requiredFields.includes(name) ? ' (required)' : '';
            const enumStr = prop.enum ? ` [${prop.enum.join('|')}]` : '';
            return `    - ${name}: ${prop.type}${enumStr}${required}${prop.description ? ` - ${prop.description}` : ''}`;
          })
          .join('\n');

        const tags = tool.metadata.tags.join(', ');
        const flags = [
          tool.metadata.mutatesState && 'mutates-state',
          tool.metadata.readsState && 'reads-state',
          tool.metadata.sideEffecting && 'side-effecting',
          tool.metadata.requiresConfirmation && 'requires-confirmation',
        ]
          .filter(Boolean)
          .join(', ');

        return `${tool.name}: ${tool.description}
  Tags: ${tags}
  Flags: ${flags}
  Parameters:
${properties}`;
      })
      .join('\n\n');
  }

  /**
   * Get a simplified tool list for structured output.
   */
  getToolListForSchema(): { name: ToolName; description: string }[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
    }));
  }
}

// Singleton instance
let defaultRegistry: ToolRegistry | null = null;

/**
 * Get the default tool registry instance.
 */
export function getDefaultRegistry(): ToolRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new ToolRegistry();
  }
  return defaultRegistry;
}

/**
 * Create a new tool registry instance.
 */
export function createRegistry(): ToolRegistry {
  return new ToolRegistry();
}
