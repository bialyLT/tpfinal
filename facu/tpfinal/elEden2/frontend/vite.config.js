import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH ? String(env.VITE_BASE_PATH) : '/';
  const disableOptimizeDeps = String(env.VITE_DISABLE_OPTIMIZE_DEPS || '').toLowerCase() === 'true';

  return {
    base,
    plugins: [react()],
    optimizeDeps: disableOptimizeDeps ? { disabled: true } : undefined,
    server: {
      host: true, // Permite acceso desde cualquier host
      allowedHosts: [
        'localhost',
        '127.0.0.1',
        '.ngrok-free.app',
        '.ngrok-free.dev',
        'grimacingly-ungainable-halle.ngrok-free.dev',
      ]
    }
  };
});
