/**
 * TLAU Orchestrator Agent - Configuration File
 * 
 * This file contains the default configuration matching the specification.
 * Import and use with initializeOrchestrator() to set up the agent.
 */

export const ORCHESTRATOR_CONFIG = {
  agent_name: "TLAU_Orchestrator_Agent",
  version: "1.0",
  description: "Master orchestrator: on every incoming prompt decide whether to use MCP resources, log prompts for CEO review, and recommend MCP tools/workflows when applicable.",
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
  outputs: {
    response_delivery: "normal_agent_response",
    log_entry_return: true,
    ceo_notification_return: true,
  },
} as const;
