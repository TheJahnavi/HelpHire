// Test script to verify vercel-handler.js functions
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock VercelRequest and VercelResponse
class MockVercelResponse {
  constructor() {
    this.headers = {};
    this.statusCode = 200;
    this.body = '';
  }
  
  setHeader(name, value) {
    this.headers[name] = value;
    return this;
  }
  
  status(code) {
    this.statusCode = code;
    return this;
  }
  
  json(data) {
    this.body = JSON.stringify(data);
    console.log(`Status: ${this.statusCode}`);
    console.log(`Response: ${this.body}`);
    return this;
  }
  
  end() {
    console.log('Response ended');
    return this;
  }
}

// Mock VercelRequest
const mockRequest = {
  url: '/api/health',
  method: 'GET',
  headers: {}
};

// Test the handler
console.log('Testing vercel-handler...');

import handler from './server/vercel-handler.js';

const mockResponse = new MockVercelResponse();

try {
  await handler(mockRequest, mockResponse);
  console.log('✅ vercel-handler executed successfully');
} catch (error) {
  console.error('❌ Error in vercel-handler:', error);
}