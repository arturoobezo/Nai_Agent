import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

// Plugin to write the actual dev server URL so Electron can connect to the right port
function writeDevServerUrl() {
  return {
    name: 'write-dev-server-url',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const address = server.httpServer.address();
        const port = address?.port || 5173;
        fs.writeFileSync('.vite-port', String(port));
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    writeDevServerUrl(),
  ],
  base: './', // Vital for Electron production builds so assets load with relative paths
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false, // Use next available port if 5173 is busy
  },
});
