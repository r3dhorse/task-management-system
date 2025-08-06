import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Add any global cleanup here such as:
  // - Cleaning up test databases
  // - Removing temporary files
  // - Stopping test services
  // - Cleanup external resources
  
  console.log('✅ E2E test environment cleanup complete');
}

export default globalTeardown;