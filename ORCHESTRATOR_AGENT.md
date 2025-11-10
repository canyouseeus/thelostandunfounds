# TLAU Orchestrator Agent

Master orchestrator agent that processes every incoming prompt to:
- Decide whether to use MCP resources
- Log prompts for CEO review
- Recommend MCP tools/workflows when applicable

## Features

- **Prompt Logging**: Automatically logs all prompts with metadata to `/Resources/prompt_logs/prompts.md`
- **Security Sanitization**: Removes sensitive data (API keys, passwords, etc.) before logging
- **MCP Registry Integration**: Checks MCP registry availability and finds relevant tools
- **Smart Decision Making**: Determines whether to use MCP resources or handle locally
- **CEO Notifications**: Notifies CEO agent when certain conditions are met

## Configuration

The orchestrator uses the following default configuration (can be customized):

```typescript
{
  agent_name: "TLAU_Orchestrator_Agent",
  version: "1.0",
  hooks: {
    on_prompt_received: true,
    log_prompt: true,
    check_mcp: true,
    notify_ceo_agent: true,
  },
  mcp_registry: {
    registry_endpoint: "https://mcp-registry.local/api/servers",
    availability_check_timeout_seconds: 6,
  },
  logging: {
    log_path: "/Resources/prompt_logs/prompts.md",
    metadata_fields: ["timestamp", "user_id", "prompt_summary", "requires_mcp", "mcp_candidates", "sensitive_data_removed", "suggested_actions", "agent_id"],
  },
  security: {
    strip_fields: ["PRIVATE_KEY", "API_KEY", "PASSWORD", "GPS", "SSN"],
    max_prompt_chars_for_log: 8000,
  },
  notify: {
    ceo_agent_endpoint: "/AI-agents/CEO_Agent/inbox",
    notify_on: ["requires_mcp", "high_complexity", "new_feature_request"],
  },
  decision_rules: {
    force_mcp_if: ["requires_gpu", "long_running_task", "access_to_mcp_only_tools"],
    prefer_local_if: ["simple_copy_edit", "short_text_generation", "meta_request"],
  },
}
```

## Usage

### Basic Usage

```typescript
import { getOrchestratorAgent } from './services/orchestrator-agent';

const orchestrator = getOrchestratorAgent();

const result = await orchestrator.processPrompt("Deploy my app to Vercel", {
  user_id: "user123",
});

console.log(result.should_use_mcp); // true/false
console.log(result.mcp_candidates); // Array of MCP tool names
console.log(result.suggested_actions); // Array of suggested actions
```

### Custom Configuration

```typescript
import { initializeOrchestrator } from './services/orchestrator-agent';

const orchestrator = initializeOrchestrator({
  hooks: {
    log_prompt: true,
    check_mcp: true,
    notify_ceo_agent: false, // Disable CEO notifications
  },
  logging: {
    log_path: "custom/path/prompts.md",
  },
});
```

## Decision Logic

The orchestrator analyzes prompts to determine:

1. **Complexity**: Low, Medium, or High
2. **GPU Requirements**: Detects GPU-related keywords
3. **Long-Running Tasks**: Identifies batch processing, analysis tasks
4. **MCP Tool Needs**: Detects references to GitHub, Vercel, Supabase, etc.
5. **Simple Edits**: Identifies simple copy/edit requests

### Force MCP Conditions

- Requires GPU resources
- Long-running tasks
- Needs access to MCP-only tools

### Prefer Local Conditions

- Simple copy/edit requests
- Short text generation
- Meta requests (how-to, explanations)

## Logging

All prompts are logged to `/Resources/prompt_logs/prompts.md` with:

- Timestamp
- User ID (if available)
- Prompt summary
- MCP requirements
- MCP candidate tools
- Sensitive data removal status
- Suggested actions
- Agent ID

Sensitive data (API keys, passwords, etc.) is automatically stripped before logging.

## CEO Notifications

The orchestrator notifies the CEO agent when:

- Prompt requires MCP resources
- High complexity detected
- New feature request identified

Notifications include metadata and reasoning.

## Integration

To integrate into your application flow:

```typescript
import { handleIncomingPrompt } from './services/orchestrator-agent.example';

// In your prompt handler
const result = await handleIncomingPrompt(userPrompt, { user_id: userId });

if (result.handler === 'mcp') {
  // Route to MCP-enabled handler
  await useMCPTools(result.tools);
} else {
  // Route to local handler
  await handleLocally();
}
```

## Files

- `src/services/orchestrator-agent.ts` - Main orchestrator implementation
- `src/services/orchestrator-agent.example.ts` - Usage examples
- `Resources/prompt_logs/prompts.md` - Prompt log file

## Security

- Automatic sanitization of sensitive fields
- Prompt truncation (max 8000 chars)
- Secure logging with redacted sensitive data

## MCP Registry Integration

The orchestrator integrates with the existing MCP registry system:

- Checks registry availability (6-second timeout)
- Searches for relevant tools based on prompt keywords
- Returns candidate tools for use

See `src/services/mcp-registry.ts` for MCP registry details.
