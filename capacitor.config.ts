import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cm.crimex.app',
  appName: 'CrimeX',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
