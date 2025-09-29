const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Load the database schema
const { users, companies } = require('./shared-dist/schema.js');

async function addCompanyAdmin() {
  try {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set');
      process.exit(1);
    }

    // Create database connection
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    console.log('Connected to database');

    // Check if the user already exists
    const userCheckQuery = 'SELECT * FROM users WHERE email = $1';
    const userCheckResult = await client.query(userCheckQuery, ['admin@techcorp.com']);
    
    if (userCheckResult.rows.length > 0) {
      console.log('User admin@techcorp.com already exists');
      await client.release();
      await pool.end();
      process.exit(0);
    }

    // Check if the company exists, if not create it
    let company;
    const companyCheckQuery = 'SELECT * FROM companies WHERE company_name = $1';
    const companyCheckResult = await client.query(companyCheckQuery, ['TechCorp Inc']);
    
    if (companyCheckResult.rows.length > 0) {
      company = companyCheckResult.rows[0];
      console.log(`Company TechCorp Inc already exists with ID: ${company.id}`);
    } else {
      console.log('Creating company TechCorp Inc');
      const companyInsertQuery = 'INSERT INTO companies (company_name) VALUES ($1) RETURNING *';
      const companyInsertResult = await client.query(companyInsertQuery, ['TechCorp Inc']);
      company = companyInsertResult.rows[0];
      console.log(`Created company with ID: ${company.id}`);
    }

    // Hash the password
    const passwordHash = await bcrypt.hash('hrpassword123', 10);

    // Create the Company Admin user
    const userInsertQuery = 'INSERT INTO users (email, password_hash, role, company_id, account_status) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const userInsertResult = await client.query(userInsertQuery, [
      'admin@techcorp.com',
      passwordHash,
      'Company Admin',
      company.id,
      'active'
    ]);

    const user = userInsertResult.rows[0];
    console.log('Successfully created Company Admin user:');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Company ID: ${user.company_id}`);

    // Release the client and end the pool
    await client.release();
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding Company Admin user:', error);
    process.exit(1);
  }
}

addCompanyAdmin();