// Test script to verify imports in Vercel environment
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('Testing imports in Vercel environment...');

try {
  // Test importing gemini.js
  const gemini = await import('./server/gemini.js');
  console.log('✅ gemini.js imported successfully');
  console.log('extractResumeData:', typeof gemini.extractResumeData);
  console.log('calculateJobMatch:', typeof gemini.calculateJobMatch);
  console.log('generateInterviewQuestions:', typeof gemini.generateInterviewQuestions);
  
  // Test importing storage.js
  const storage = await import('./server/storage.js');
  console.log('✅ storage.js imported successfully');
  
  // Test importing schema.js
  const schema = await import('./shared/schema.js');
  console.log('✅ schema.js imported successfully');
  
  console.log('✅ All imports successful');
} catch (error) {
  console.error('❌ Error importing modules:', error.message);
}