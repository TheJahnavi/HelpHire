const fs = require('fs');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('No .env file found');
  process.exit(1);
}

// Read .env file
const envContent = fs.readFileSync('.env', 'utf8');
console.log('.env file content:');
console.log(envContent);

// Check if there are any users in the database by looking at the dump file
if (fs.existsSync('dump.sql')) {
  const dumpContent = fs.readFileSync('dump.sql', 'utf8');
  console.log('\nDatabase dump file exists');
  // Check if there are any INSERT statements
  const insertStatements = dumpContent.match(/INSERT INTO/g);
  if (insertStatements) {
    console.log(`Found ${insertStatements.length} INSERT statements in dump file`);
  } else {
    console.log('No INSERT statements found in dump file');
  }
} else {
  console.log('No database dump file found');
}

console.log('\nTo create a test HR user, you can run:');
console.log('curl -X POST http://localhost:5000/api/setup/hr \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"email":"hr1@techcorp.com","password":"hrpassword123","company":"TechCorp Inc"}\'');