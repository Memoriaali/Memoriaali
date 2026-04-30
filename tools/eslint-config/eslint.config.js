/**
 * Main ESLint configuration for Memoriaali v2.0 monorepo
 *
 * This file exports the default configuration that combines all specific configs.
 * Individual packages can import specific configurations as needed:
 *
 * @example
 * // For Node.js packages (backend, packages/*)
 * import { nodeDevConfig } from '@memoriaali/eslint-config/node/dev';
 *
 * // For React packages (frontend)
 * import { reactDevConfig } from '@memoriaali/eslint-config/react/dev';
 *
 * // For base configuration only
 * import { baseConfig } from '@memoriaali/eslint-config/base';
 */

import baseConfig from './configs/base.js';
import { nodeDevConfig } from './configs/node.dev.js';
import { reactDevConfig } from './configs/react.dev.js';

export { baseConfig, nodeDevConfig, reactDevConfig };
export default baseConfig;
