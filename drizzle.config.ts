import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env', quiet: true });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
