import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
export default defineConfig({
  testDir:'./tests/browser',
  fullyParallel:true,
  use:{baseURL:'http://127.0.0.1:4321',headless:true,launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(existsSync('/usr/bin/google-chrome')?'/usr/bin/google-chrome':undefined)}},
  webServer:{command:'npm run preview -- --port 4321',url:'http://127.0.0.1:4321/ja/',reuseExistingServer:!process.env.CI,timeout:30000},
  reporter:'list',
});
