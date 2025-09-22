// Check environment variables
import dotenv from 'dotenv';
dotenv.config();

console.log('Environment variables check:');
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');

if (process.env.OPENROUTER_API_KEY) {
  console.log('API Key length:', process.env.OPENROUTER_API_KEY.length);
  console.log('API Key starts with:', process.env.OPENROUTER_API_KEY.substring(0, 10) + '...');
}