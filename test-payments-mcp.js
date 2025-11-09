#!/usr/bin/env node
/**
 * Payment Testing Script with MCP Support
 * 
 * This script tests payment functionality using MCP tools if available,
 * or falls back to direct API calls.
 * 
 * Usage:
 *   node test-payments-mcp.js [options]
 */

let BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
let API_BASE = `${BASE_URL}/api/tiktok`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Try to import MCP tools
let mcpToolsAvailable = false;
let importTool = null;

async function checkMCPTools() {
  try {
    // Try to import from tools registry
    const toolsModule = await import('@tools/index');
    if (toolsModule && toolsModule.importTool) {
      importTool = toolsModule.importTool;
      mcpToolsAvailable = true;
      log('✅ MCP Tools Registry Available', 'green');
      return true;
    }
  } catch (error) {
    // MCP tools not available, will use direct API calls
    log('⚠️  MCP Tools Registry not available, using direct API calls', 'yellow');
  }
  return false;
}

async function testPayPalConfigMCP() {
  logSection('Testing PayPal Config (via MCP)');
  
  try {
    const paypalConfig = await importTool('paypal', 'getConfig');
    const config = await paypalConfig.execute({});
    
    log('✅ PayPal Config Retrieved via MCP', 'green');
    console.log(JSON.stringify(config, null, 2));
    return config;
  } catch (error) {
    log(`❌ MCP Error: ${error.message}`, 'red');
    return null;
  }
}

async function testPayPalConfigAPI(cookie) {
  logSection('Testing PayPal Config (via API)');
  
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    
    log(`GET ${API_BASE}/payments/paypal-config`, 'blue');
    
    const response = await fetch(`${API_BASE}/payments/paypal-config`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log('✅ PayPal Config Retrieved Successfully', 'green');
      console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      log('❌ PayPal Config Failed', 'red');
      console.log(`Status: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function testPaymentCreateMCP(amount = 4.99, currency = 'USD') {
  logSection('Testing Payment Creation (via MCP)');
  
  try {
    const createOrder = await importTool('paypal', 'createOrder');
    const result = await createOrder.execute({
      amount: amount,
      currency: currency,
      plan: 'premium',
      billingCycle: 'monthly'
    });
    
    log('✅ Payment Created via MCP', 'green');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.orderId) {
      log(`\n📝 Order ID: ${result.orderId}`, 'cyan');
    }
    
    return result;
  } catch (error) {
    log(`❌ MCP Error: ${error.message}`, 'red');
    return null;
  }
}

async function testPaymentCreateAPI(cookie) {
  logSection('Testing Payment Creation (via API)');
  
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    
    const body = {
      plan: 'premium',
      billingCycle: 'monthly',
    };
    
    log(`POST ${API_BASE}/payments/create`, 'blue');
    log(`Body: ${JSON.stringify(body, null, 2)}`, 'yellow');
    
    const response = await fetch(`${API_BASE}/payments/create`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log('✅ Payment Created Successfully', 'green');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.orderId) {
        log(`\n📝 Order ID: ${data.orderId}`, 'cyan');
        log('Use this orderId with --test-execute --order-id <orderId>', 'yellow');
      }
      
      if (data.approvalUrl) {
        log(`\n🔗 Approval URL: ${data.approvalUrl}`, 'cyan');
      }
      
      return data;
    } else {
      log('❌ Payment Creation Failed', 'red');
      console.log(`Status: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function testPaymentExecuteMCP(orderId) {
  logSection('Testing Payment Execution (via MCP)');
  
  if (!orderId) {
    log('❌ Order ID is required for payment execution', 'red');
    return null;
  }
  
  try {
    const captureOrder = await importTool('paypal', 'captureOrder');
    const result = await captureOrder.execute({
      orderId: orderId
    });
    
    log('✅ Payment Executed via MCP', 'green');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    log(`❌ MCP Error: ${error.message}`, 'red');
    return null;
  }
}

async function testPaymentExecuteAPI(cookie, orderId) {
  logSection('Testing Payment Execution (via API)');
  
  if (!orderId) {
    log('❌ Order ID is required for payment execution', 'red');
    log('Usage: --test-execute --order-id <orderId>', 'yellow');
    return null;
  }
  
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (cookie) {
      headers['Cookie'] = cookie;
    }
    
    const body = {
      orderId: orderId,
    };
    
    log(`POST ${API_BASE}/payments/execute`, 'blue');
    log(`Body: ${JSON.stringify(body, null, 2)}`, 'yellow');
    
    const response = await fetch(`${API_BASE}/payments/execute`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      log('✅ Payment Executed Successfully', 'green');
      console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      log('❌ Payment Execution Failed', 'red');
      console.log(`Status: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function runAllTests(cookie, useMCP = false) {
  logSection('Running All Payment Tests');
  
  if (useMCP && mcpToolsAvailable) {
    log('🔧 Using MCP Tools', 'magenta');
    
    // Test 1: PayPal Config
    const config = await testPayPalConfigMCP();
    
    if (!config) {
      log('\n⚠️  PayPal config failed via MCP. Falling back to API.', 'yellow');
      await testPayPalConfigAPI(cookie);
    }
    
    // Test 2: Payment Creation
    const createResult = await testPaymentCreateMCP();
    
    if (createResult && createResult.orderId) {
      log('\n⚠️  Note: Payment execution test skipped.', 'yellow');
      log('To test execution, use the orderId from above with:', 'yellow');
      log(`node test-payments-mcp.js --test-execute --order-id ${createResult.orderId}`, 'cyan');
    }
  } else {
    log('🔧 Using Direct API Calls', 'magenta');
    
    // Test 1: PayPal Config
    const config = await testPayPalConfigAPI(cookie);
    
    if (!config) {
      log('\n⚠️  PayPal config failed. Some tests may not work.', 'yellow');
    }
    
    // Test 2: Payment Creation
    const createResult = await testPaymentCreateAPI(cookie);
    
    if (createResult && createResult.orderId) {
      log('\n⚠️  Note: Payment execution test skipped.', 'yellow');
      log('To test execution, use the orderId from above with:', 'yellow');
      log(`node test-payments-mcp.js --test-execute --order-id ${createResult.orderId}`, 'cyan');
    }
  }
  
  logSection('Tests Complete');
}

// Parse command line arguments
const args = process.argv.slice(2);
let baseUrl = BASE_URL;
let cookie = null;
let testConfig = false;
let testCreate = false;
let testExecute = false;
let orderId = null;
let useMCP = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--base-url' && args[i + 1]) {
    baseUrl = args[++i];
  } else if (arg === '--cookie' && args[i + 1]) {
    cookie = args[++i];
  } else if (arg === '--test-config') {
    testConfig = true;
  } else if (arg === '--test-create') {
    testCreate = true;
  } else if (arg === '--test-execute') {
    testExecute = true;
  } else if (arg === '--order-id' && args[i + 1]) {
    orderId = args[++i];
  } else if (arg === '--use-mcp') {
    useMCP = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Payment Testing Script with MCP Support

Usage:
  node test-payments-mcp.js [options]

Options:
  --base-url <url>       Base URL for API (default: http://localhost:3000)
  --cookie <cookie>      Session cookie for authenticated requests
  --test-config          Test PayPal config endpoint only
  --test-create          Test payment creation endpoint only
  --test-execute         Test payment execution endpoint
  --order-id <id>        Order ID for execute test (required with --test-execute)
  --use-mcp              Force use of MCP tools (if available)
  --help, -h             Show this help message

Examples:
  # Test all endpoints (auto-detect MCP or use API)
  node test-payments-mcp.js --cookie "session=abc123"

  # Test only config
  node test-payments-mcp.js --test-config

  # Test payment creation with MCP
  node test-payments-mcp.js --test-create --use-mcp

  # Test payment execution
  node test-payments-mcp.js --test-execute --order-id "5O190127TN364715T" --cookie "session=abc123"

Environment Variables:
  API_BASE_URL           Override base URL (default: http://localhost:3000)
    `);
    process.exit(0);
  }
}

// Update API_BASE if baseUrl changed
API_BASE = `${baseUrl}/api/tiktok`;

// Run tests based on flags
(async () => {
  log('🚀 Payment Testing Script (with MCP Support)', 'cyan');
  log(`Base URL: ${baseUrl}`, 'blue');
  
  // Check for MCP tools
  const mcpAvailable = await checkMCPTools();
  
  if (cookie) {
    log(`Using cookie: ${cookie.substring(0, 50)}...`, 'blue');
  } else {
    log('⚠️  No cookie provided. Some endpoints may require authentication.', 'yellow');
  }
  
  const shouldUseMCP = useMCP && mcpAvailable;
  
  if (testConfig) {
    if (shouldUseMCP) {
      await testPayPalConfigMCP();
    } else {
      await testPayPalConfigAPI(cookie);
    }
  } else if (testCreate) {
    if (shouldUseMCP) {
      await testPaymentCreateMCP();
    } else {
      await testPaymentCreateAPI(cookie);
    }
  } else if (testExecute) {
    if (shouldUseMCP) {
      await testPaymentExecuteMCP(orderId);
    } else {
      await testPaymentExecuteAPI(cookie, orderId);
    }
  } else {
    // Run all tests
    await runAllTests(cookie, shouldUseMCP);
  }
})();
