import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Log environment and command info
  console.log('Vite Config - Command:', command);
  console.log('Vite Config - Mode:', mode);
  console.log('Vite Config - NODE_ENV:', process.env.NODE_ENV);
  console.log('Vite Config - Host:', process.env.HOST);
  
  const allowedHosts = [
    'localhost',
    '127.0.0.1',
    'local-guard-connect.onrender.com',
    'localhost:3000',
    'localhost:8080'
  ];
  
  console.log('Allowed Hosts:', allowedHosts);
  
  // Create base config
  const config = {
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      'process.env': {},
      'import.meta.env.ALLOWED_HOSTS': JSON.stringify(allowedHosts),
    },
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      hmr: {
        clientPort: 443,
      },
      cors: true,
      allowedHosts: allowedHosts,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      proxy: {
        '/api': {
          target: env.VITE_SUPABASE_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/api/, '')
        }
      }
    },
    preview: {
      host: true,
      port: 3000,
      strictPort: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      proxy: {
        '/api': {
          target: env.VITE_SUPABASE_URL || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/api/, '')
        }
      }
    }
  };

  // Log final config for debugging
  console.log('Vite Config:', JSON.stringify(config, null, 2));
  
  return config;
});
