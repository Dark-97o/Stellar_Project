import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      '@creit.tech/stellar-wallets-kit': '@creit.tech/stellar-wallets-kit/index.mjs'
    }
  },
  optimizeDeps: {
    include: ['@creit.tech/stellar-wallets-kit']
  }
})
