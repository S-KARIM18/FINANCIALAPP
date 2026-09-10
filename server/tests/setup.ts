/**
 * Jest test setup — runs before all tests.
 * Loads environment variables from .env.test if present, otherwise uses .env.
 */
import dotenv from 'dotenv';
import path from 'path';

// Load test environment
const testEnvPath = path.join(__dirname, '../.env.test');
const defaultEnvPath = path.join(__dirname, '../.env');

const loaded = dotenv.config({ path: testEnvPath });
if (loaded.error) {
  dotenv.config({ path: defaultEnvPath });
}

// Ensure NODE_ENV is test
process.env.NODE_ENV = 'test';
