#!/usr/bin/env node
/**
 * Payment Testing Script
 * 
 * This script helps test payment endpoints for the TikTok Downloader app.
 * 
 * Usage:
 *   node test-payments.js [options]
 * 
 * Options:
 *   --base-url <url>     Base URL for API (default: http://localhost:3000)
 *   --cookie <cookie>    Session cookie for authenticated requests
 *   --test-config        Test PayPal config endpoint
 *   --test-create        Test payment creation endpoint
 *   --test-execute       Test payment execution (requires orderId)
 *   --order-id <id>      Order ID for execute test
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/tiktok`;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function testPayPalConfig(cookie) {
  logSection('Testing PayPal Config Endpoint');
  
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

async function testPaymentCreate(cookie) {
  logSection('Testing Payment Creation');
  
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

async function testPaymentExecute(cookie, orderId) {
  logSection('Testing Payment Execution');
  
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

async function runAllTests(cookie) {
  logSection('Running All Payment Tests');
  
  // Test 1: PayPal Config
  const config = await testPayPalConfig(cookie);
  
  if (!config) {
    log('\n⚠️  PayPal config failed. Some tests may not work.', 'yellow');
  }
  
  // Test 2: Payment Creation
  const createResult = await testPaymentCreate(cookie);
  
  if (createResult && createResult.orderId) {
    log('\n⚠️  Note: Payment execution test skipped.', 'yellow');
    log('To test execution, use the orderId from above with:', 'yellow');
    log(`node test-payments.js --test-execute --order-id ${createResult.orderId}`, 'cyan');
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
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
Payment Testing Script

Usage:
  node test-payments.js [options]

Options:
  --base-url <url>       Base URL for API (default: http://localhost:3000)
  --cookie <cookie>      Session cookie for authenticated requests
  --test-config          Test PayPal config endpoint only
  --test-create          Test payment creation endpoint only
  --test-execute         Test payment execution endpoint
  --order-id <id>        Order ID for execute test (required with --test-execute)
  --help, -h             Show this help message

Examples:
  # Test all endpoints
  node test-payments.js --cookie "session=abc123"

  # Test only config
  node test-payments.js --test-config

  # Test payment creation
  node test-payments.js --test-create --cookie "session=abc123"

  # Test payment execution
  node test-payments.js --test-execute --order-id "5O190127TN364715T" --cookie "session=abc123"

Environment Variables:
  API_BASE_URL           Override base URL (default: http://localhost:3000)
    `);
    process.exit(0);
  }
}

// Update API_BASE if baseUrl changed
const API_BASE = `${baseUrl}/api/tiktok`;

// Run tests based on flags
(async () => {
  log('🚀 Payment Testing Script', 'cyan');
  log(`Base URL: ${baseUrl}`, 'blue');
  
  if (cookie) {
    log(`Using cookie: ${cookie.substring(0, 50)}...`, 'blue');
  } else {
    log('⚠️  No cookie provided. Some endpoints may require authentication.', 'yellow');
  }
  
  if (testConfig) {
    await testPayPalConfig(cookie);
  } else if (testCreate) {
    await testPaymentCreate(cookie);
  } else if (testExecute) {
    await testPaymentExecute(cookie, orderId);
  } else {
    // Run all tests
    await runAllTests(cookie);
  }
})();
