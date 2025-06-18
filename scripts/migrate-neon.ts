import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.development.local' });

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    console.log('🔄 Running database migrations...');

    // Create Page table
    await sql`
      CREATE TABLE IF NOT EXISTS "Page" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "pageId" TEXT NOT NULL UNIQUE,
        "pageName" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create Ad table
    await sql`
      CREATE TABLE IF NOT EXISTS "Ad" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "adArchiveId" TEXT NOT NULL UNIQUE,
        "pageId" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "startDate" TIMESTAMP(3) NOT NULL,
        "endDate" TIMESTAMP(3),
        "title" TEXT,
        "url" TEXT,
        FOREIGN KEY ("pageId") REFERENCES "Page"("pageId")
      )
    `;

    // Create AdStatusLog table
    await sql`
      CREATE TABLE IF NOT EXISTS "AdStatusLog" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "adArchiveId" TEXT NOT NULL,
        "pageId" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reason" TEXT,
        FOREIGN KEY ("adArchiveId") REFERENCES "Ad"("adArchiveId"),
        FOREIGN KEY ("pageId") REFERENCES "Page"("pageId")
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS "Ad_pageId_idx" ON "Ad"("pageId")`;
    await sql`CREATE INDEX IF NOT EXISTS "AdStatusLog_adArchiveId_idx" ON "AdStatusLog"("adArchiveId")`;
    await sql`CREATE INDEX IF NOT EXISTS "AdStatusLog_pageId_idx" ON "AdStatusLog"("pageId")`;
    await sql`CREATE INDEX IF NOT EXISTS "AdStatusLog_timestamp_idx" ON "AdStatusLog"("timestamp")`;

    console.log('✅ Database migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate(); 