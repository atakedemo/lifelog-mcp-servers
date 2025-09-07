import { defineBackend } from '@aws-amplify/backend';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";
import {
  HttpIamAuthorizer,
  HttpUserPoolAuthorizer,
} from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { defineFunction } from '@aws-amplify/backend';

import { auth } from './auth/resource';
import { data } from './data/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  mcpServerFunction: defineFunction({
    name: 'mcp-server',
    entry: './mcp-handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512,
    environment: {
      BASE_URL: process.env.BASE_URL || '',
      COGNITO_DOMAIN_URL: process.env.COGNITO_DOMAIN_URL || '',
    }
  }),
  resourceMetadataFunction: defineFunction({
    name: 'resource-metadata',
    entry: './resource-metadata-handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512,
    environment: {
      BASE_URL: process.env.BASE_URL || '',
      AUTH_SERVER_URL: process.env.AUTH_SERVER_URL || '',
    }
  }),
  authorizationServerFunction: defineFunction({
    name: 'authorization-server',
    entry: './authorization-server-handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512,
    environment: {
      AUTH_SERVER_URL: process.env.AUTH_SERVER_URL || '',
    }
  }),
});

// create a new API stack
const apiStack = backend.createStack("api-stack");

const httpApi = new HttpApi(apiStack, "HttpApi", {
  apiName: "mcp-server-http",
  corsPreflight: {
    allowMethods: [
      CorsHttpMethod.GET,
      CorsHttpMethod.POST,
      CorsHttpMethod.PUT,
      CorsHttpMethod.DELETE,
    ],
    allowOrigins: ["*"],
    allowHeaders: ["*"],
  },
  createDefaultStage: true,
});

// MCP Server(/mcp)
const httpLambdaIntegrationMcp = new HttpLambdaIntegration(
  "LambdaIntegration",
  backend.mcpServerFunction.resources.lambda
);

httpApi.addRoutes({
  path: "/mcp",
  methods: [HttpMethod.POST],
  integration: httpLambdaIntegrationMcp,
});

// Resource Metadata(/resource-metadata)
const httpLambdaIntegrationResourceMetadata = new HttpLambdaIntegration(
  "LambdaIntegrationResourceMetadata",
  backend.resourceMetadataFunction.resources.lambda
);

httpApi.addRoutes({
  path: "/.well-known/oauth-protected-resource",
  methods: [HttpMethod.GET],
  integration: httpLambdaIntegrationResourceMetadata,
});

// Authorization Server(/authorization-server)
const httpLambdaIntegrationAuthorizationServer = new HttpLambdaIntegration(
  "LambdaIntegrationAuthorizationServer",
  backend.authorizationServerFunction.resources.lambda
);

httpApi.addRoutes({
  path: "/.well-known/oauth-authorization-server",
  methods: [HttpMethod.GET],
  integration: httpLambdaIntegrationAuthorizationServer,
});