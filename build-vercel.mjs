// Build script for Vercel deployment
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

console.log('Building for Vercel deployment...');

// Create dist directory if it doesn't exist
if (!existsSync('dist')) {
  mkdirSync('dist');
  console.log('Created dist directory');
}

// Compile gemini.ts to gemini.js
console.log('Compiling gemini.ts...');
execSync('npx esbuild server/gemini.ts --platform=node --bundle --format=esm --outfile=server/gemini.js --external:openai', { stdio: 'inherit' });
console.log('✅ Compiled gemini.ts');

// Compile storage.ts to storage.js
console.log('Compiling storage.ts...');
execSync('npx esbuild server/storage.ts --platform=node --bundle --format=esm --outfile=server/storage.js --external:@neondatabase/serverless --external:drizzle-orm --external:zod --external:drizzle-zod', { stdio: 'inherit' });
console.log('✅ Compiled storage.ts');

// Compile schema.ts to schema.js
console.log('Compiling schema.ts...');
execSync('npx esbuild shared/schema.ts --platform=node --bundle --format=esm --outfile=shared/schema.js --external:zod --external:drizzle-orm --external:drizzle-zod', { stdio: 'inherit' });
console.log('✅ Compiled schema.ts');

console.log('✅ Build completed successfully');