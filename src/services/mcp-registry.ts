/**
 * MCP Registry Integration
 * 
 * This file sets up the MCP registry integration for the project.
 * Tools are automatically discovered from Cursor's MCP configuration.
 */

import {
  initializeCursorAutoDiscovery,
  toolRegistry,
  importTool,
  searchTools,
} from '@tools/index';

// MCP client placeholder - in production, this would be initialized
// from your actual MCP client setup
let mcpClient: any = null;

/**
 * Initialize MCP registry with auto-discovery
 */
export async function initializeMCPRegistry() {
  try {
    console.log('🔍 Initializing MCP Registry...');
    
    // Initialize auto-discovery (requires MCP client)
    // For now, this is a placeholder - you'll need to provide
    // an actual MCP client instance
    if (mcpClient) {
      const { servers, tools } = await initializeCursorAutoDiscovery(mcpClient);
      console.log(`✅ Discovered ${servers.length} MCP servers with ${tools} tools`);
      return { servers, tools };
    } else {
      console.log('⚠️  MCP client not configured. Tools will be loaded on-demand.');
      return { servers: [], tools: 0 };
    }
  } catch (error) {
    console.error('❌ Failed to initialize MCP registry:', error);
    throw error;
  }
}

/**
 * Get available tools from a namespace
 */
export async function getAvailableTools(namespace: string) {
  return searchTools('', { namespace, limit: 100 });
}

/**
 * Use a tool from the registry
 */
export async function useTool(namespace: string, toolName: string, params: any) {
  try {
    const tool = await importTool(namespace, toolName);
    return await tool.execute(params);
  } catch (error) {
    console.error(`Failed to use tool ${namespace}.${toolName}:`, error);
    throw error;
  }
}

/**
 * Search for tools by keyword
 */
export function searchAvailableTools(keyword: string, options?: any) {
  return searchTools(keyword, options);
}

// Export registry instance for direct access if needed
export { toolRegistry };

