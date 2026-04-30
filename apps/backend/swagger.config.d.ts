import swaggerJsDoc from 'swagger-jsdoc';
/**
 * Swagger JSDoc configuration for Memoriaali V2 API
 *
 * This configuration generates comprehensive OpenAPI documentation by:
 * - Scanning route files for openapi comments
 * - Integrating with Zod-to-OpenAPI generated schemas
 * - Providing standardized error responses
 * - Including cultural heritage domain context
 */
export declare const swaggerOptions: swaggerJsDoc.OAS3Options;
/**
 * Generate the complete Swagger documentation
 */
interface SwaggerSpec {
  paths: Record<
    string,
    Record<
      string,
      {
        security?: Array<Record<string, unknown>>;
      }
    >
  >;
  [key: string]: unknown;
}
export declare const generateSwaggerSpec: () => SwaggerSpec;
/**
 * Swagger UI configuration options
 */
export declare const swaggerUiOptions: {
  explorer: boolean;
  swaggerOptions: {
    persistAuthorization: boolean;
    displayRequestDuration: boolean;
    filter: boolean;
    showExtensions: boolean;
    showCommonExtensions: boolean;
    docExpansion: string;
    defaultModelsExpandDepth: number;
    defaultModelExpandDepth: number;
    tryItOutEnabled: boolean;
  };
  customCss: string;
  customSiteTitle: string;
  customfavIcon: string;
};
/**
 * ReDoc configuration options
 */
export declare const redocOptions: {
  title: string;
  redocOptions: {
    theme: {
      colors: {
        primary: {
          main: string;
        };
      };
      typography: {
        fontSize: string;
        fontFamily: string;
      };
    };
    hideDownloadButton: boolean;
    hideHostname: boolean;
    expandResponses: string;
    jsonSampleExpandLevel: number;
    hideSingleRequestSampleTab: boolean;
    menuToggle: boolean;
    nativeScrollbars: boolean;
    pathInMiddlePanel: boolean;
    requiredPropsFirst: boolean;
    scrollYOffset: number;
    showExtensions: boolean;
    sortPropsAlphabetically: boolean;
    suppressWarnings: boolean;
  };
};
export {};
//# sourceMappingURL=swagger.config.d.ts.map
