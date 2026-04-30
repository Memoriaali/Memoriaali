import { defineConfig } from '@hey-api/openapi-ts';

// Frontend OpenAPI code generation configuration
// Generates a TypeScript SDK from the backend OpenAPI spec
export default defineConfig({
  input: 'http://localhost:3001/api/v2/docs.json',
  output: {
    path: 'src/lib/api/generated',
    // Keep formatting/linting off for generated code; our repo already ignores this folder
    format: undefined,
    lint: undefined,
    clean: true,
  },
  plugins: [
    {
      name: '@hey-api/client-next',
      runtimeConfigPath: '../hey-api',
    },
  ],
});
