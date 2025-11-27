/**
 * EKS Route Testing Script
 * Tests various API endpoints with different HTTP methods to understand EKS routing behavior
 */

const API_BASE = 'https://workforceagent.elevancehealth.com';

// Test configurations for different endpoints and methods
const testConfigs = [
  {
    name: 'Health Check - GET /api/conversations/health',
    method: 'GET',
    url: `${API_BASE}/api/conversations/health`,
    expectedStatuses: [200, 404]
  },
  {
    name: 'Conversations List - GET /api/conversations',
    method: 'GET',
    url: `${API_BASE}/api/conversations`,
    expectedStatuses: [200, 401, 404]
  },
  {
    name: 'User Conversations - GET /api/conversations/user/test_user',
    method: 'GET',
    url: `${API_BASE}/api/conversations/user/test_user`,
    expectedStatuses: [200, 401, 404]
  },
  {
    name: 'Specific Conversation - GET /api/conversations/123',
    method: 'GET',
    url: `${API_BASE}/api/conversations/123`,
    expectedStatuses: [200, 401, 404]
  },
  {
    name: 'Create Conversation - POST /api/conversations',
    method: 'POST',
    url: `${API_BASE}/api/conversations`,
    body: {
      title: 'Test Conversation',
      user_id: 'test_user',
      messages: []
    },
    expectedStatuses: [200, 201, 400, 401, 404]
  },
  {
    name: 'Delete Conversation - DELETE /api/conversations/test123',
    method: 'DELETE',
    url: `${API_BASE}/api/conversations/test123`,
    expectedStatuses: [200, 204, 401, 404]
  },
  {
    name: 'Update Conversation - PUT /api/conversations/test123',
    method: 'PUT',
    url: `${API_BASE}/api/conversations/test123`,
    body: {
      title: 'Updated Test Conversation'
    },
    expectedStatuses: [200, 204, 401, 404]
  },
  // Test non-/api/ routes for comparison
  {
    name: 'Token Endpoint - POST /token',
    method: 'POST',
    url: `${API_BASE}/token`,
    body: {
      username: 'test',
      password: 'test'
    },
    expectedStatuses: [200, 400, 401]
  },
  {
    name: 'Workforce Chat - POST /workforceagent/chat',
    method: 'POST',
    url: `${API_BASE}/workforceagent/chat`,
    body: {
      message: 'test'
    },
    expectedStatuses: [200, 400, 401]
  }
];

// HTTP status code descriptions for better understanding
const statusDescriptions = {
  200: 'OK - Request successful',
  201: 'Created - Resource created successfully',
  204: 'No Content - Request successful, no response body',
  400: 'Bad Request - Invalid request format/data',
  401: 'Unauthorized - Authentication required',
  404: 'Not Found - Endpoint or resource not found',
  405: 'Method Not Allowed - HTTP method not supported',
  501: 'Not Implemented - Endpoint functionality not implemented',
  502: 'Bad Gateway - Proxy/gateway error',
  503: 'Service Unavailable - Service temporarily unavailable'
};

async function makeRequest(config) {
  const options = {
    method: config.method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (config.body) {
    options.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(config.url, options);
    const statusText = statusDescriptions[response.status] || response.statusText;
    
    let responseText;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonData = await response.json();
        responseText = JSON.stringify(jsonData, null, 2);
      } else {
        responseText = await response.text();
      }
    } catch (e) {
      responseText = 'Unable to parse response body';
    }

    return {
      success: true,
      status: response.status,
      statusText,
      responseText: responseText.length > 500 ? responseText.substring(0, 500) + '...' : responseText,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: null,
      statusText: 'Network Error'
    };
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('EKS ROUTE TESTING SCRIPT');
  console.log('Testing API routing behavior at:', API_BASE);
  console.log('='.repeat(80));
  console.log();

  const results = {
    total: testConfigs.length,
    apiRoutes: 0,
    nonApiRoutes: 0,
    methodResults: {
      GET: { success: 0, fail: 0, total: 0 },
      POST: { success: 0, fail: 0, total: 0 },
      DELETE: { success: 0, fail: 0, total: 0 },
      PUT: { success: 0, fail: 0, total: 0 }
    }
  };

  for (let i = 0; i < testConfigs.length; i++) {
    const config = testConfigs[i];
    console.log(`\n${i + 1}. ${config.name}`);
    console.log(`   ${config.method} ${config.url}`);
    
    // Track API vs non-API routes
    if (config.url.includes('/api/')) {
      results.apiRoutes++;
    } else {
      results.nonApiRoutes++;
    }

    results.methodResults[config.method].total++;
    
    const result = await makeRequest(config);
    
    if (result.success) {
      const isExpectedStatus = config.expectedStatuses.includes(result.status);
      const isRoutingIssue = result.status === 501 || result.status === 405 || result.status === 502;
      
      console.log(`   ✓ Response: ${result.status} ${result.statusText}`);
      
      if (isRoutingIssue) {
        console.log(`   ⚠️  ROUTING ISSUE: ${result.status} indicates endpoint routing problem`);
        results.methodResults[config.method].fail++;
      } else if (isExpectedStatus) {
        console.log(`   ✓ Status expected for this endpoint`);
        results.methodResults[config.method].success++;
      } else {
        console.log(`   ⚠️  Unexpected status (expected: ${config.expectedStatuses.join(', ')})`);
        results.methodResults[config.method].success++; // Still counts as successful routing
      }
      
      // Show important headers
      if (result.headers['server']) {
        console.log(`   Server: ${result.headers['server']}`);
      }
      if (result.headers['allow']) {
        console.log(`   Allowed Methods: ${result.headers['allow']}`);
      }
      
      // Show response preview for routing issues
      if (isRoutingIssue && result.responseText) {
        console.log(`   Response: ${result.responseText}`);
      }
    } else {
      console.log(`   ❌ Network Error: ${result.error}`);
      results.methodResults[config.method].fail++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${results.total}`);
  console.log(`/api/ Routes: ${results.apiRoutes}`);
  console.log(`Non-/api/ Routes: ${results.nonApiRoutes}`);
  console.log();
  
  console.log('Method Success Rates:');
  Object.entries(results.methodResults).forEach(([method, stats]) => {
    if (stats.total > 0) {
      const successRate = ((stats.success / stats.total) * 100).toFixed(1);
      console.log(`  ${method.padEnd(6)}: ${stats.success}/${stats.total} successful (${successRate}%)`);
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS');
  console.log('='.repeat(80));
  
  // Analyze DELETE method specifically
  const deleteStats = results.methodResults.DELETE;
  if (deleteStats.total > 0) {
    if (deleteStats.fail === deleteStats.total) {
      console.log('🔍 DELETE method appears to be blocked/not routed in EKS');
    } else if (deleteStats.success > 0) {
      console.log('✅ DELETE method is routed properly in EKS');
    }
  }
  
  console.log('\nNext Steps:');
  console.log('1. Check which HTTP methods are failing with 501/405 errors');
  console.log('2. Compare /api/ vs non-/api/ route success rates');
  console.log('3. Look for "Allow" headers to see permitted methods');
  console.log('4. If DELETE returns 501, the EKS ingress/proxy may not route DELETE methods');
}

// Run the tests
runTests().catch(console.error);