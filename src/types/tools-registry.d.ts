/**
 * Ambient types for the optional `tools-registry` sibling package.
 *
 * The registry lives in a separate repo checked out next to this one during
 * local development. It is absent in CI and on Vercel — vite.config.ts only
 * wires up the `@tools` alias when the directory exists, and marks
 * `@scot33/tools-registry` external so the build succeeds without it.
 *
 * TypeScript had no such fallback, so every import from it resolved to an
 * error and every value derived from those types silently became `any`
 * (which then produced a cascade of implicit-any errors in src/skills).
 * These declarations describe the contract the app actually relies on, so
 * the code type-checks whether or not the sibling repo is present.
 *
 * If the real package is checked out alongside, its own types take
 * precedence for the relative-path imports.
 */

declare module '*/tools-registry/src/skills/types' {
    /** Parameters a skill accepts, as declared in its definition. */
    export interface SkillParameter {
        name: string
        type: 'string' | 'number' | 'boolean' | 'object' | 'array'
        description?: string
        required?: boolean
        default?: unknown
        /** Return true when valid, or a message describing the problem. */
        validation?: (value: any) => true | string
    }

    export interface SkillMetadata {
        name: string
        description: string
        category?: string
        tags?: string[]
        aliases?: string[]
        version?: string
        requiredParams?: string[]
        optionalParams?: string[]
        example?: string
        definitionPath?: string
    }

    /** Runtime services handed to a skill during execution. */
    export interface SkillExecutionContext {
        log?: (message: string, level?: 'info' | 'warn' | 'error' | 'debug') => void
        tools?: {
            import: (namespace: string, name: string) => Promise<any>
            [key: string]: any
        }
        skills?: {
            execute: (name: string, params?: Record<string, any>) => Promise<any>
            [key: string]: any
        }
        [key: string]: any
    }

    export interface SkillDefinition {
        name: string
        description: string
        metadata?: SkillMetadata
        parameters?: SkillParameter[]
        /** Pre-flight check. Return true, or a message describing the problem. */
        validate?: (params: Record<string, any>) => true | string
        execute: (
            params: Record<string, any>,
            context?: SkillExecutionContext
        ) => Promise<any> | any
        /**
         * Called when execute() throws. The second argument is the parameter
         * object the skill was invoked with — not the execution context — so
         * handlers can report which inputs failed.
         */
        errorHandler?: (error: any, params: Record<string, any>) => any
    }
}

declare module '@scot33/tools-registry' {
    /** Loaded dynamically and feature-detected; shape varies by version. */
    export const skillRegistry: any
    export const skills: any
    export const toolRegistry: any
    export const executeSkill: any
    export const listSkills: any
    export const searchSkills: any
    export const importTool: any
    export const searchTools: any
    export const initializeCursorAutoDiscovery: any
    const _default: any
    export default _default
}
