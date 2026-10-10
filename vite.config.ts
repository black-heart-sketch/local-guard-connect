import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env variables
  const env = loadEnv(mode, process.cwd(), '');
  const webPort = Number(env.VITE_DEV_PORT || 3001);
  
  // Log environment and command info
  console.log('Vite Config - Command:', command);
  console.log('Vite Config - Mode:', mode);
  console.log('Vite Config - NODE_ENV:', process.env.NODE_ENV);
  console.log('Vite Config - Host:', process.env.HOST);
  
  const allowedHosts = [
    'localhost',
    '127.0.0.1',
    'local-guard-connect.onrender.com',
    'localhost:3001',
    'localhost:8080'
  ];
  
  console.log('Allowed Hosts:', allowedHosts);
  
  // Create base config
  const config = {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      // Ensure hooks and the renderer always resolve to the same React runtime.
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    define: {
      'process.env': {},
      'import.meta.env.ALLOWED_HOSTS': JSON.stringify(allowedHosts),
    },
    server: {
      host: true,
      port: webPort,
      strictPort: true,
      ...(env.VITE_HMR_CLIENT_PORT ? { hmr: { clientPort: Number(env.VITE_HMR_CLIENT_PORT) } } : {}),
      cors: true,
      allowedHosts: allowedHosts,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
    },
    preview: {
      host: true,
      port: webPort,
      strictPort: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
      },
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
          ws: true
        }
      }
    }
  };

  // Log final config for debugging
  console.log('Vite Config:', JSON.stringify(config, null, 2));
  
  return config;
});
