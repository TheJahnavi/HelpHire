// Script to add interview fields to candidates table
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function migrateInterviewFields() {
  // Create a database client
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to database');

    // Check if the columns already exist
    const checkColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'candidates' 
      AND column_name IN ('interview_status', 'interview_datetime', 'meeting_link', 'transcript_url', 'report_url', 'scheduler_token')
    `;

    const result = await client.query(checkColumnsQuery);
    const existingColumns = result.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumns);

    // Add columns that don't exist
    const columnsToAdd = [
      { name: 'interview_status', type: 'VARCHAR(50) DEFAULT \'applied\'' },
      { name: 'interview_datetime', type: 'TIMESTAMP' },
      { name: 'meeting_link', type: 'TEXT' },
      { name: 'transcript_url', type: 'TEXT' },
      { name: 'report_url', type: 'TEXT' },
      { name: 'scheduler_token', type: 'VARCHAR(64) UNIQUE' }
    ];

    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        const addColumnQuery = `
          ALTER TABLE candidates 
          ADD COLUMN ${column.name} ${column.type}
        `;
        
        try {
          await client.query(addColumnQuery);
          console.log(`Added column: ${column.name}`);
        } catch (error) {
          console.log(`Column ${column.name} may already exist or error occurred:`, error.message);
        }
      } else {
        console.log(`Column ${column.name} already exists`);
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
}

// Run the migration
migrateInterviewFields();