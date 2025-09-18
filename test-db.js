import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

console.log('Testing database connection...');
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 50));
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    console.log('Pool created successfully');
    
    // Test connection
    pool.query('SELECT 1').then(result => {
      console.log('Database connection successful:', result);
      pool.end();
    }).catch(error => {
      console.error('Database connection failed:', error);
      pool.end();
    });
  } catch (error) {
    console.error('Failed to create pool:', error);
  }
} else {
  console.log('DATABASE_URL is not set');
}