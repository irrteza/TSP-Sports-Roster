import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { config } from 'dotenv';

export default defineConfig(() => {
    // Load from .env.local if it exists (local development) - override system env vars
    config({ path: '.env.local', override: true });
    // Use process.env which now includes both .env.local and system env vars (Vercel)
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
        'process.env.AIRTABLE_API_KEY': JSON.stringify(process.env.AIRTABLE_API_KEY),
        'process.env.AIRTABLE_BASE_ID': JSON.stringify(process.env.AIRTABLE_BASE_ID),
        'process.env.AIRTABLE_TABLE_ID': JSON.stringify(process.env.AIRTABLE_TABLE_ID),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
