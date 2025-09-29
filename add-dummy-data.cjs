const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function addDummyData() {
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

    // Check if TechCorp Inc company exists, if not create it
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

    // Hash passwords
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create HR users (check if they exist first)
    console.log('Creating HR users...');
    const hrUsers = [];
    
    // HR User 1
    const hr1CheckQuery = 'SELECT * FROM users WHERE email = $1';
    const hr1CheckResult = await client.query(hr1CheckQuery, ['hr1@techcorp.com']);
    
    if (hr1CheckResult.rows.length > 0) {
      hrUsers.push(hr1CheckResult.rows[0]);
      console.log(`HR user 1 already exists with ID: ${hr1CheckResult.rows[0].id}`);
    } else {
      const hr1InsertQuery = 'INSERT INTO users (email, name, password_hash, role, company_id, account_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
      const hr1InsertResult = await client.query(hr1InsertQuery, [
        'hr1@techcorp.com',
        'HR User 1',
        passwordHash,
        'HR',
        company.id,
        'active'
      ]);
      hrUsers.push(hr1InsertResult.rows[0]);
      console.log(`Created HR user 1 with ID: ${hr1InsertResult.rows[0].id}`);
    }

    // HR User 2
    const hr2CheckQuery = 'SELECT * FROM users WHERE email = $1';
    const hr2CheckResult = await client.query(hr2CheckQuery, ['hr2@techcorp.com']);
    
    if (hr2CheckResult.rows.length > 0) {
      hrUsers.push(hr2CheckResult.rows[0]);
      console.log(`HR user 2 already exists with ID: ${hr2CheckResult.rows[0].id}`);
    } else {
      const hr2InsertQuery = 'INSERT INTO users (email, name, password_hash, role, company_id, account_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
      const hr2InsertResult = await client.query(hr2InsertQuery, [
        'hr2@techcorp.com',
        'HR User 2',
        passwordHash,
        'HR',
        company.id,
        'active'
      ]);
      hrUsers.push(hr2InsertResult.rows[0]);
      console.log(`Created HR user 2 with ID: ${hr2InsertResult.rows[0].id}`);
    }

    // Get existing jobs for these HR users
    console.log('Checking existing jobs...');
    let existingJobs = [];
    for (const hrUser of hrUsers) {
      const jobsCheckQuery = 'SELECT * FROM jobs WHERE hr_handling_user_id = $1';
      const jobsCheckResult = await client.query(jobsCheckQuery, [hrUser.id]);
      existingJobs = existingJobs.concat(jobsCheckResult.rows);
    }
    
    console.log(`Found ${existingJobs.length} existing jobs`);

    // Create jobs only if we don't have enough
    console.log('Creating jobs...');
    const jobsNeeded = 6 - existingJobs.length; // We want 3 jobs per HR user (6 total)
    const jobs = [...existingJobs]; // Start with existing jobs
    
    if (jobsNeeded > 0) {
      // Distribute jobs evenly between HR users
      const jobsPerHr = Math.ceil(jobsNeeded / hrUsers.length);
      
      for (let hrIndex = 0; hrIndex < hrUsers.length; hrIndex++) {
        const hrUser = hrUsers[hrIndex];
        const jobsForThisHr = existingJobs.filter(job => job.hr_handling_user_id === hrUser.id).length;
        const jobsToCreate = Math.max(0, 3 - jobsForThisHr); // We want 3 jobs per HR user
        
        for (let i = 1; i <= jobsToCreate; i++) {
          const jobTitle = hrUser.email === 'hr1@techcorp.com' 
            ? `Software Engineer Level ${jobsForThisHr + i}`
            : `Data Scientist Level ${jobsForThisHr + i}`;
            
          const jobDescription = hrUser.email === 'hr1@techcorp.com'
            ? `Job description for Software Engineer Level ${jobsForThisHr + i}. This position requires experience in modern web technologies and a passion for building scalable applications.`
            : `Job description for Data Scientist Level ${jobsForThisHr + i}. This position requires experience in machine learning, data analysis, and statistical modeling.`;
            
          const skills = hrUser.email === 'hr1@techcorp.com'
            ? ['JavaScript', 'React', 'Node.js', 'TypeScript']
            : ['Python', 'SQL', 'Machine Learning', 'Statistics'];
            
          const experience = hrUser.email === 'hr1@techcorp.com'
            ? '3-5 years'
            : '2-4 years';
          
          const jobInsertQuery = 'INSERT INTO jobs (job_title, job_description, skills, experience, added_by_user_id, hr_handling_user_id, company_id, job_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
          const jobInsertResult = await client.query(jobInsertQuery, [
            jobTitle,
            jobDescription,
            skills,
            experience,
            hrUser.id,
            hrUser.id,
            company.id,
            'active'
          ]);
          jobs.push(jobInsertResult.rows[0]);
          console.log(`Created job "${jobInsertResult.rows[0].job_title}" for ${hrUser.email}`);
        }
      }
    }

    // Count existing candidates
    console.log('Checking existing candidates...');
    let existingCandidateCount = 0;
    const jobIds = jobs.map(job => job.id);
    
    if (jobIds.length > 0) {
      const candidatesCheckQuery = `SELECT COUNT(*) as count FROM candidates WHERE job_id = ANY($1)`;
      const candidatesCheckResult = await client.query(candidatesCheckQuery, [jobIds]);
      existingCandidateCount = parseInt(candidatesCheckResult.rows[0].count);
    }
    
    console.log(`Found ${existingCandidateCount} existing candidates`);

    // Create candidates only if we don't have enough (2 per job)
    console.log('Creating candidates...');
    const candidatesNeeded = (jobs.length * 2) - existingCandidateCount;
    
    if (candidatesNeeded > 0) {
      let candidateCount = existingCandidateCount;
      
      for (const job of jobs) {
        // Check how many candidates already exist for this job
        const jobCandidatesCheckQuery = 'SELECT COUNT(*) as count FROM candidates WHERE job_id = $1';
        const jobCandidatesCheckResult = await client.query(jobCandidatesCheckQuery, [job.id]);
        const existingCandidatesForJob = parseInt(jobCandidatesCheckResult.rows[0].count);
        const candidatesToCreate = Math.max(0, 2 - existingCandidatesForJob); // We want 2 candidates per job
        
        for (let i = 1; i <= candidatesToCreate; i++) {
          candidateCount++;
          const candidateInsertQuery = 'INSERT INTO candidates (candidate_name, email, job_id, candidate_skills, candidate_experience, match_percentage, resume_url, hr_handling_user_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *';
          const candidateInsertResult = await client.query(candidateInsertQuery, [
            `Candidate ${candidateCount}`,
            `candidate${candidateCount}@example.com`,
            job.id,
            ['JavaScript', 'React', 'Node.js'],
            3,
            Math.floor(Math.random() * 40) + 60, // Random match percentage between 60-100
            `/resumes/candidate${candidateCount}.pdf`,
            job.hr_handling_user_id,
            'applied'
          ]);
          console.log(`Created candidate "${candidateInsertResult.rows[0].candidate_name}" for job "${job.job_title}"`);
        }
      }
    }

    console.log('\nSummary:');
    console.log(`- Company: TechCorp Inc (ID: ${company.id})`);
    console.log(`- HR Users: ${hrUsers.length}`);
    console.log(`- Jobs: ${jobs.length}`);
    console.log(`- Candidates: at least ${jobs.length * 2} (2 per job)`);

    // Release the client and end the pool
    await client.release();
    await pool.end();
    
    console.log('\nDummy data added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding dummy data:', error);
    process.exit(1);
  }
}

addDummyData();