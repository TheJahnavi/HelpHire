// Build script for Vercel deployment
import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync } from 'fs';

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

// Compile vercel-handler.ts to vercel-handler.js
console.log('Compiling vercel-handler.ts...');
execSync('npx esbuild server/vercel-handler.ts --platform=node --bundle --format=esm --outfile=server/vercel-handler.js --external:@vercel/node --external:bcryptjs --external:zod --external:@neondatabase/serverless --external:drizzle-orm --external:drizzle-zod --external:mammoth --external:fs --external:path', { stdio: 'inherit' });
console.log('✅ Compiled vercel-handler.ts');

// Compile vercel-entry.ts to vercel-entry.js
console.log('Compiling vercel-entry.ts...');
execSync('npx esbuild server/vercel-entry.ts --platform=node --bundle --format=esm --outfile=server/vercel-entry.js --external:express --external:path --external:fs --external:url --external:dotenv', { stdio: 'inherit' });
console.log('✅ Compiled vercel-entry.ts');

// Copy vercel-entry.js to dist directory
console.log('Copying vercel-entry.js to dist directory...');
copyFileSync('server/vercel-entry.js', 'dist/vercel-entry.js');
console.log('✅ Copied vercel-entry.js to dist directory');

console.log('✅ Build completed successfully');