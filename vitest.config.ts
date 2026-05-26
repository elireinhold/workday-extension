import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "jsdom",   // gives you window.fetch, window.location, etc.
    globals: true,          // so you can use describe/test/expect without imports
  }
})