#!/usr/bin/env node
/**
 * Test PayPal MCP Tools Directly
 * 
 * This script attempts to use PayPal MCP tools if they're configured
 * in Cursor's MCP system.
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

log('🔍 Checking PayPal Configuration...', 'cyan');

// Check if we can access PayPal through different methods
async function checkPayPalAccess() {
  log('\n1. Checking Production API...', 'cyan');
  try {
    const response = await fetch('https://thelostandunfounds.com/api/tiktok/payments/paypal-config', {
      credentials: 'include'
    });
    const text = await response.text();
    log(`   Status: ${response.status}`, response.ok ? 'green' : 'yellow');
    if (response.ok) {
      try {
        const json = JSON.parse(text);
        log('   ✅ Valid JSON response:', 'green');
        console.log(JSON.stringify(json, null, 2));
        return { method: 'production-api', config: json };
      } catch (e) {
        log(`   ⚠️  Response is not JSON: ${text.substring(0, 100)}`, 'yellow');
      }
    } else {
      log(`   Response: ${text.substring(0, 200)}`, 'yellow');
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
  }

  log('\n2. Checking Local API...', 'cyan');
  try {
    const response = await fetch('http://localhost:3000/api/tiktok/payments/paypal-config', {
      credentials: 'include'
    });
    log(`   Status: ${response.status}`, response.ok ? 'green' : 'yellow');
    if (response.ok) {
      const json = await response.json();
      log('   ✅ Valid JSON response:', 'green');
      console.log(JSON.stringify(json, null, 2));
      return { method: 'local-api', config: json };
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
  }

  log('\n3. Checking MCP Tools Registry...', 'cyan');
  try {
    const toolsModule = await import('@tools/index');
    if (toolsModule && toolsModule.importTool) {
      log('   ✅ Tools registry module found', 'green');
      try {
        const paypalConfig = await toolsModule.importTool('paypal', 'getConfig');
        const config = await paypalConfig.execute({});
        log('   ✅ PayPal config via MCP:', 'green');
        console.log(JSON.stringify(config, null, 2));
        return { method: 'mcp-tools', config };
      } catch (e) {
        log(`   ⚠️  PayPal tool not available: ${e.message}`, 'yellow');
      }
    }
  } catch (error) {
    log(`   ⚠️  Tools registry not available: ${error.message}`, 'yellow');
  }

  return null;
}

// Test payment creation
async function testPaymentCreation(config) {
  if (!config) {
    log('\n❌ No PayPal configuration found. Cannot test payment creation.', 'red');
    return;
  }

  log('\n🧪 Testing Payment Creation...', 'cyan');
  
  // Try via production API
  try {
    const response = await fetch('https://thelostandunfounds.com/api/tiktok/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        plan: 'premium',
        billingCycle: 'monthly'
      })
    });
    
    const data = await response.json();
    log(`   Status: ${response.status}`, response.ok ? 'green' : 'yellow');
    if (response.ok) {
      log('   ✅ Payment created successfully:', 'green');
      console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      log(`   ⚠️  Error: ${data.error || JSON.stringify(data)}`, 'yellow');
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red');
  }
}

(async () => {
  const config = await checkPayPalAccess();
  
  if (config) {
    log(`\n✅ PayPal Configuration Found via: ${config.method}`, 'green');
    await testPaymentCreation(config);
  } else {
    log('\n⚠️  PayPal configuration not accessible through any method.', 'yellow');
    log('   Please ensure:', 'yellow');
    log('   1. Backend API is deployed and running', 'yellow');
    log('   2. PayPal credentials are configured', 'yellow');
    log('   3. API endpoints are accessible', 'yellow');
  }
})();
