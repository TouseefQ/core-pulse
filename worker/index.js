import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import pg from 'pg';
import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@127.0.0.1:5432/core_pulse_db';

// Detect if we are using a Cloud URL (Railway URLs always start with 'postgresql://')
const isCloud = connectionString.includes('railway.app');

const pool = new Pool({
  connectionString,
  ssl: isCloud ? { rejectUnauthorized: false } : false
});

async function runAudit(url) {
  console.log(`\n🔍 Starting Audit for: ${url}`);
  
  // 1. Launch Browser using Puppeteer (Downloads its own Chrome, guaranteed to work)
  console.log("   🚀 Launching Puppeteer Browser...");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, // Use installed Chrome in Docker
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-gpu',
      '--disable-dev-shm-usage' // Helps with memory in Docker
    ]
  });

  // 2. Get the Port that Puppeteer opened
  // Puppeteer manages the port, we just need to ask "Where are you?"
  const browserWSEndpoint = browser.wsEndpoint();
  const port = new URL(browserWSEndpoint).port;

  // 3. Configure Lighthouse to use that specific port
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: Number(port), // <--- Connect to Puppeteer
  };

  // 4. Run the Audit
  console.log("   📸 Taking snapshot...");
  const runnerResult = await lighthouse(url, options);
  
  const audits = runnerResult.lhr.audits;
  const score = runnerResult.lhr.categories.performance.score * 100;

  const metrics = {
    lcp: audits['largest-contentful-paint'].numericValue,
    cls: audits['cumulative-layout-shift'].numericValue,
    fid: audits['max-potential-fid'].numericValue,
    score: score
  };

  console.log('✅ Audit Complete!');
  console.log(`   Performance: ${metrics.score}`);
  
  // 5. Close the browser
  await browser.close();

  return metrics;
}

async function processQueue() {
  try {
    const res = await pool.query('SELECT * FROM tracked_urls');
    
    if (res.rows.length === 0) {
      console.log("📭 No URLs found in database. Add one via the API first.");
      return;
    }

    for (const row of res.rows) {
      try {
        const data = await runAudit(row.url);
        
        await pool.query(
          `INSERT INTO audits (url_id, lcp_score, cls_score, fid_score, performance_score) 
           VALUES ($1, $2, $3, $4, $5)`,
          [row.id, data.lcp, data.cls, data.fid, data.score]
        );
        console.log(`💾 Saved result for ${row.url}`);
        
      } catch (err) {
        console.error(`❌ Failed to audit ${row.url}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Database Error:", err);
  } finally {
    // await pool.end();
    // We leave the connection OPEN so the loop can use it again later.
    console.log("   (Batch complete, keeping DB connection open)");
  }
}

const INTERVAL_MINUTES = 120; // How often to check (in minutes)

async function startService() {
  console.log(`🚀 CorePulse Worker started. Running every ${INTERVAL_MINUTES} minutes.`);

  // Run immediately on startup
  await processQueue();

  // Loop forever
  while (true) {
    console.log(`💤 Sleeping for ${INTERVAL_MINUTES} minutes...`);
    
    // Calculate milliseconds: Minutes * 60 seconds * 1000 ms
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MINUTES * 60 * 1000));
    
    console.log("⏰ Waking up for scheduled audit...");
    await processQueue();
  }
}

// Handle crashes so the worker doesn't die completely
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  // Optional: Restart logic could go here
});

startService();