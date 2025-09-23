import { createServer } from 'http';
import vercelEntry from './dist/vercel-entry.js';

// Create a mock request and response
const mockReq = {
  url: '/'
};

const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    console.log('JSON Response:', data);
  },
  setHeader: function(header, value) {
    console.log('Setting header:', header, '=', value);
  },
  send: function(data) {
    console.log('Sending HTML data (length:', data.length, 'characters)');
    console.log('First 200 characters:', data.substring(0, 200));
  }
};

console.log('Testing vercel-entry.js...');
vercelEntry(mockReq, mockRes);