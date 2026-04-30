/**
 * Main Vitest configuration for Memoriaali v2.0 monorepo
 * 
 * This file exports the default configuration and specific configs
 * for different package types. Individual packages can import
 * the appropriate configuration based on their needs.
 * 
 * @example
 * // For Node.js packages (backend, packages/*)
 * import { nodeConfig } from '@memoriaali/vitest-config/node';
 * export default nodeConfig;
 * 
 * // For React packages (frontend)
 * import { reactConfig } from '@memoriaali/vitest-config/react';
 * export default reactConfig;
 */

import { nodeConfig } from './configs/node.js';
import { reactConfig } from './configs/react.js';

export { nodeConfig, reactConfig };
export default nodeConfig;