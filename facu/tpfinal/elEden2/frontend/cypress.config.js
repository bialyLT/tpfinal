import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'jfcpri',
  e2e: {
    baseUrl: 'https://grimacingly-ungainable-halle.ngrok-free.dev',
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      return config;
    }
  }
});
