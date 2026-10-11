import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'./tests',testMatch:'browser.spec.ts',timeout:90000,workers:1,reporter:'list',outputDir:'./test-results',use:{baseURL:'http://localhost:5173/magus/',viewport:{width:1440,height:900},headless:true,launchOptions:{args:['--no-sandbox']}} });
