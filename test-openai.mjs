// Test OpenAI API directly
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing OpenAI API directly...');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openrouter-api-key-here',
  baseURL: 'https://openrouter.ai/api/v1',
});

console.log('API Key configured:', !!process.env.OPENAI_API_KEY);

async function testAPI() {
  try {
    console.log('Sending test request...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say hello world" }],
      temperature: 0.0,
      max_tokens: 100,
    });
    
    console.log('Response received:');
    console.log(JSON.stringify(response, null, 2));
    
    const content = response.choices[0]?.message?.content || "";
    console.log('Content:', content);
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Status:', error.status);
    console.error('Code:', error.code);
  }
}

testAPI();