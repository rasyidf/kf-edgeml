import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor/tfjs": ["@tensorflow/tfjs"],
          "vendor/tfjs-vis": ["@tensorflow/tfjs-vis"],
          "vendor/uicomponents": ["@fortawesome/fontawesome-free", "sweetalert2"]
        },
      },
    }
  },
  server: {
    port: 4000
  },
  resolve: {
      alias: {
        "vue": "vue/dist/vue.esm.js"
      }
  }
});
