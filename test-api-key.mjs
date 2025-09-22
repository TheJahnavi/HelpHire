// Test script to verify API key is working
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing API key configuration...');
console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
console.log('API Key length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

if (process.env.OPENAI_API_KEY) {
  console.log('API Key starts with:', process.env.OPENAI_API_KEY.substring(0, 15) + '...');
}

// Test the OpenAI client
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openrouter-api-key-here',
  baseURL: 'https://openrouter.ai/api/v1',
});

async function testAPI() {
  try {
    console.log('\nTesting API connection...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'Hello, World!' and nothing else." }],
      temperature: 0.0,
      max_tokens: 50,
    });
    
    const content = response.choices[0]?.message?.content || "";
    console.log('API Response:', content);
    
    if (content.includes('Hello, World!')) {
      console.log('✅ API key is working correctly');
    } else {
      console.log('❌ API response unexpected');
    }
  } catch (error) {
    console.error('❌ API Error:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
  }
}

testAPI();