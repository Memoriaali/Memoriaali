import swaggerJsDoc, { type Components } from 'swagger-jsdoc';

import { componentsResponses } from './src/openapi-schemas/components.responses';
import { generateComponents } from './src/openapi-schemas/components.schemas';

/**
 * Swagger JSDoc configuration for Memoriaali V2 API
 *
 * This configuration generates comprehensive OpenAPI documentation by:
 * - Scanning route files for openapi comments
 * - Integrating with Zod-to-OpenAPI generated schemas
 * - Providing standardized error responses
 * - Including cultural heritage domain context
 */
export const swaggerOptions: swaggerJsDoc.OAS3Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Memoriaali V2 API',
      version: '2.0.0-dev',
    },
    servers: [],
    // Global security requirement - applies to all endpoints unless overridden
    security: [
      {
        bearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token obtained from the authentication endpoint',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for service-to-service authentication (if applicable)',
        },
      },
      schemas: generateComponents() as Components['schemas'],
      responses: componentsResponses,
      parameters: {
        // Common path parameters
        submissionId: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier for the submission',
          schema: {
            type: 'string',
            format: 'uuid',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
        userId: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'Unique identifier for the user',
          schema: {
            type: 'string',
            format: 'uuid',
            example: '550e8400-e29b-41d4-a716-446655440001',
          },
        },

        // Common query parameters
        page: {
          name: 'page',
          in: 'query',
          required: false,
          description: 'Page number for pagination (1-based)',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
            example: 1,
          },
        },
        limit: {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Number of items per page',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            example: 20,
          },
        },
        include: {
          name: 'include',
          in: 'query',
          required: false,
          description: 'Comma-separated list of related resources to include',
          schema: {
            type: 'string',
            example: 'submitter,files,metadata',
          },
        },

        // Cultural heritage specific parameters
        culturalLevel: {
          name: 'culturalLevel',
          in: 'query',
          required: false,
          description: 'Filter by cultural sensitivity level',
          schema: {
            type: 'string',
            enum: ['PUBLIC', 'ACADEMIC', 'RESTRICTED', 'SENSITIVE'],
            example: 'ACADEMIC',
          },
        },
        submissionStatus: {
          name: 'status',
          in: 'query',
          required: false,
          description: 'Filter by submission status',
          schema: {
            type: 'string',
            enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'],
            example: 'APPROVED',
          },
        },
      },
      examples: {
        // Cultural heritage domain examples
        submissionExample: {
          summary: 'Historical photograph submission',
          value: {
            title: 'Historical photographs from Lappeenranta 1960-1970',
            description:
              'Collection of photographs documenting the post-war reconstruction and daily life in Lappeenranta during the 1960s',
            culturalSensitivity: {
              level: 'ACADEMIC',
              restrictions: ['PERSONAL_DATA'],
              accessNotes: 'Contains identifiable individuals, requires researcher agreement',
            },
            metadata: {
              creator: 'Pekka Virtanen',
              date: '1960-1970',
              subject: [
                'photography',
                'urban development',
                'post-war reconstruction',
                'Lappeenranta',
              ],
              language: 'fi',
              type: 'Image',
              format: 'JPEG',
            },
          },
        },
        oralHistoryExample: {
          summary: 'Oral history interview submission',
          value: {
            title: 'Interview with Aino Virtanen about life in 1940s Karelia',
            description:
              'Recorded interview discussing family life, traditions, and experiences during the evacuation from Karelia',
            culturalSensitivity: {
              level: 'RESTRICTED',
              restrictions: ['PERSONAL_DATA', 'RELIGIOUS_CONTENT'],
              accessNotes: 'Contains personal family information and religious practices',
            },
            metadata: {
              creator: 'Dr. Maija Korhonen, University of Helsinki',
              contributor: 'Aino Virtanen',
              date: '2024-01-15',
              subject: [
                'oral history',
                'Karelia',
                'evacuation',
                'family traditions',
                'religious practices',
              ],
              language: 'fi',
              type: 'Sound',
              format: 'audio/mp3',
              duration: 'PT2H30M',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Documentation',
        description: 'API documentation and specification endpoints',
      },
      {
        name: 'Health',
        description: 'System health monitoring and diagnostics',
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization',
      },
      {
        name: 'Users',
        description: 'User account management and profiles',
      },
      {
        name: 'Documents',
        description: 'Document management and metadata operations',
      },
      {
        name: 'Groups',
        description: 'Group management and organization',
      },
      {
        name: 'Users in Groups',
        description: 'User-group membership management',
      },
      {
        name: 'Documents in Collections',
        description: 'Document-collection relationship management',
      },
      {
        name: 'Comments',
        description: 'Comment management and moderation',
      },
      {
        name: 'Research Requests',
        description: 'Research access request management',
      },
      {
        name: 'SIP',
        description: 'E-ARK SIP generation and archive package management',
      },
      {
        name: 'Oral History',
        description: 'Oral history interview recording and management',
      },
    ],
  },
  apis: [
    './src/api/**/*.ts',
    './src/schemas/**/*.ts',
    './dist/api/**/*.js',
    './dist/schemas/**/*.js',
  ],
};

/**
 * Generate the complete Swagger documentation
 */
interface SwaggerSpec {
  paths: Record<string, Record<string, { security?: Array<Record<string, unknown>> }>>;
  [key: string]: unknown;
}

export const generateSwaggerSpec = () => {
  const spec = swaggerJsDoc(swaggerOptions) as SwaggerSpec;

  // Override security for public endpoints that don't require authentication
  const publicEndpoints = [
    '/api/v2/auth/login',
    '/api/v2/auth/refresh',
    '/api/v2/health',
    '/api/v2/health/detailed',
    '/api/v2/docs.json',
    '/api/v2/docs.yaml',
  ];

  // Set security to empty array for public endpoints
  publicEndpoints.forEach((endpoint) => {
    const pathObj = spec.paths[endpoint];
    if (pathObj) {
      Object.keys(pathObj).forEach((method) => {
        const methodObj = pathObj[method];
        if (methodObj) {
          methodObj.security = [];
        }
      });
    }
  });

  // Fix security scheme references to use lowercase bearerAuth consistently
  Object.keys(spec.paths).forEach((path) => {
    const pathObj = spec.paths[path];
    if (pathObj) {
      Object.keys(pathObj).forEach((method) => {
        const operation = pathObj[method];
        if (operation?.security) {
          operation.security.forEach((securityObj) => {
            if (securityObj.BearerAuth) {
              securityObj.bearerAuth = securityObj.BearerAuth;
              delete securityObj.BearerAuth;
            }
          });
        }
      });
    }
  });

  return spec;
};

/**
 * Swagger UI configuration options
 */
export const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
  },
  customCss: `
    .swagger-ui .topbar { 
      display: none; 
    }
    .swagger-ui .info .title {
      color: #1f4e79;
    }
    .swagger-ui .scheme-container {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
  `,
  customSiteTitle: 'Memoriaali V2 API Documentation',
  customfavIcon: '/favicon.ico',
};

/**
 * ReDoc configuration options
 */
export const redocOptions = {
  title: 'Memoriaali V2 API - ReDoc',
  redocOptions: {
    theme: {
      colors: {
        primary: {
          main: '#1f4e79',
        },
      },
      typography: {
        fontSize: '14px',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      },
    },
    hideDownloadButton: false,
    hideHostname: false,
    expandResponses: '200,201',
    jsonSampleExpandLevel: 2,
    hideSingleRequestSampleTab: true,
    menuToggle: true,
    nativeScrollbars: false,
    pathInMiddlePanel: false,
    requiredPropsFirst: true,
    scrollYOffset: 0,
    showExtensions: false,
    sortPropsAlphabetically: true,
    suppressWarnings: false,
  },
};
