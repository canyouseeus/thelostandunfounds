/**
 * Skill Type Definitions
 * 
 * Local type definitions for skills to avoid external dependencies
 * that could cause Cursor to crash during code analysis.
 */

export interface SkillMetadata {
  name: string;
  description: string;
  category: string;
  tags: string[];
  aliases?: string[];
  version?: string;
  requiredParams?: string[];
  optionalParams?: string[];
  example?: string;
}

export interface SkillParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
  validation?: (value: any) => boolean | string;
}

export interface SkillExecutionContext {
  log?: (message: string, level?: 'info' | 'warn' | 'error') => void;
  tools?: {
    import: (namespace: string, toolName: string) => Promise<any>;
  };
  [key: string]: any;
}

export interface SkillDefinition {
  name: string;
  description: string;
  metadata: SkillMetadata;
  parameters?: SkillParameter[];
  validate?: (params: Record<string, any>) => boolean | string;
  execute: (params: Record<string, any>, context?: SkillExecutionContext) => Promise<any>;
  errorHandler?: (error: Error, params: Record<string, any>) => any;
}
