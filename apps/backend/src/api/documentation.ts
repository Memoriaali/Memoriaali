import { Request, Response, Router } from 'express';
import yaml from 'js-yaml';
import redoc from 'redoc-express';
import swaggerUi from 'swagger-ui-express';

import { generateSwaggerSpec, redocOptions, swaggerUiOptions } from '../openapi-schemas';

/**
 * Create documentation router with Swagger UI, ReDoc, and raw spec endpoints
 *
 * This router provides multiple ways to access API documentation:
 * - Swagger UI: Interactive documentation for testing
 * - ReDoc: Alternative clean documentation view
 * - JSON/YAML: Raw OpenAPI specifications for client generation
 *
 * @returns Configured Express router with documentation endpoints
 */
export const createDocumentationRouter = (): Router => {
  const router = Router();

  // Generate the OpenAPI specification
  const swaggerSpec = generateSwaggerSpec();

  /**
   * @openapi
   * /docs.json:
   *   get:
   *     summary: Get OpenAPI specification in JSON format
   *     description: |
   *       Returns the complete OpenAPI 3.1 specification for the Memoriaali V2 API
   *       in JSON format. This endpoint can be used by code generators and other
   *       tools that require the API specification.
   *     tags: ['Documentation']
   *     security: []
   *     operationId: getOpenApiJson
   *     x-permissions: []
   *     responses:
   *       200:
   *         description: OpenAPI specification in JSON format
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               description: Complete OpenAPI 3.1 specification
   */
  router.get('/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.send(JSON.stringify(swaggerSpec, null, 2));
  });

  /**
   * @openapi
   * /docs.yaml:
   *   get:
   *     summary: Get OpenAPI specification in YAML format
   *     description: |
   *       Returns the complete OpenAPI 3.1 specification for the Memoriaali V2 API
   *       in YAML format. This format is often preferred for human readability
   *       and version control.
   *     tags: ['Documentation']
   *     security: []
   *     operationId: getOpenApiYaml
   *     x-permissions: []
   *     responses:
   *       200:
   *         description: OpenAPI specification in YAML format
   *         content:
   *           application/x-yaml:
   *             schema:
   *               type: string
   *               description: Complete OpenAPI 3.1 specification in YAML format
   */
  router.get('/docs.yaml', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.send(yaml.dump(swaggerSpec));
  });

  /**
   * Swagger UI endpoint
   *
   * Provides interactive API documentation where developers can:
   * - Browse all available endpoints
   * - Test API calls directly from the browser
   * - See request/response examples
   * - Understand authentication requirements
   */
  router.use('/docs', swaggerUi.serve);
  router.get('/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  /**
   * ReDoc endpoint
   *
   * Alternative documentation view that provides:
   * - Clean, professional appearance
   * - Better mobile experience
   * - Different information layout
   * - Export capabilities
   */
  router.get(
    '/redoc',
    redoc({
      ...redocOptions,
      specUrl: '/api/v2/docs.json',
    }),
  );

  /**
   * Documentation index endpoint
   *
   * Provides navigation to all available documentation formats
   */
  router.get('/', (req: Request, res: Response) => {
    const baseUrl = `${req.protocol}://${req.get('host')}/api/v2`;

    res.json({
      name: 'Memoriaali V2 API Documentation',
      version: '2.0.0-dev',
      description: 'Digital archive reception platform for Finnish memory institutions',
      documentation: {
        interactive: {
          swagger: `${baseUrl}/docs`,
          description: 'Interactive API documentation with testing capabilities',
        },
        alternative: {
          redoc: `${baseUrl}/redoc`,
          description: 'Clean, professional documentation view',
        },
        raw: {
          json: `${baseUrl}/docs.json`,
          yaml: `${baseUrl}/docs.yaml`,
          description: 'Raw OpenAPI specifications for code generation',
        },
      },
      endpoints: {
        health: `${baseUrl}/health`,
        healthDetailed: `${baseUrl}/health/detailed`,
        healthDatabase: `${baseUrl}/health/database`,
      },
      resources: {
        'API Reference': `${baseUrl}/docs`,
        'GitHub Repository': 'https://github.com/memoriaali/memoriaali-v2',
        Support: 'mailto:support@memoriaali.fi',
      },
      authentication: {
        type: 'Bearer Token (JWT)',
        description:
          'Most endpoints require authentication. Use the /auth/login endpoint to obtain a token.',
        headerFormat: 'Authorization: Bearer <your-jwt-token>',
      },
    });
  });

  return router;
};
