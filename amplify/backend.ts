import { defineBackend } from '@aws-amplify/backend';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";

import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";

import { defineFunction, secret } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
// const cognitoClientSecret = defineSecret('USER_POOL_CLIENT_SECRET');
const backend = defineBackend({
  auth,
  data,
  mcpServerFunction: defineFunction({
    name: 'mcp-server',
    entry: './function/mcp-server/mcp-handler.ts',
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
    entry: './function/mcp-server/resource-metadata-handler.ts',
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
    entry: './function/mcp-server/authorization-server-handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512,
    environment: {
      AUTH_SERVER_URL: process.env.AUTH_SERVER_URL || '',
    }
  }),
  oauth2RegistrationFunction: defineFunction({
    name: 'oauth2-registration',
    entry: './function/mcp-server/oauth2-register-handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512,
    environment: {
      BASE_URL: process.env.BASE_URL || '',
      COGNITO_USER_POOL_CLIENT_ID: process.env.COGNITO_USER_POOL_CLIENT_ID || '',
      COGNITO_CLIENT_SECRET: secret('USER_POOL_CLIENT_SECRET') || '',
    }
  }),
  oauth2AuthorizationFunction: defineFunction({
    name: 'oauth2-authorization',
    entry: './function/mcp-server/oauth2-authorization-handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512,
    environment: {
      BASE_URL: process.env.BASE_URL || '',
      COGNITO_DOMAIN: process.env.COGNITO_DOMAIN || '',
      COGNITO_CLIENT_SECRET: secret('USER_POOL_CLIENT_SECRET'),
    }
  }),
  oauth2CallbackFunction: defineFunction({
    name: 'oauth2-callback',
    entry: './function/mcp-server/oauth2-callback-handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512,
  }),
  oauth2TokenFunction: defineFunction({
    name: 'oauth2-token',
    entry: './function/mcp-server/oauth2-token-handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512,
    environment: {
      BASE_URL: process.env.BASE_URL || '',
      COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || '',
      COGNITO_CLIENT_SECRET: secret('USER_POOL_CLIENT_SECRET') || '',
    }
  }),
});

// create a new API stack
const apiStack = backend.createStack("api-stack");

// Get Cognito information dynamically for logging/debugging
const userPoolId = backend.auth.resources.userPool.userPoolId;
const userPoolName = backend.auth.resources.userPool.userPoolProviderName;
const region = backend.auth.resources.userPool.stack.region;

// Construct API Gateway URL dynamically
const apiGatewayUrl = `https://${apiStack.stackName}.execute-api.${region}.amazonaws.com`;

// Configure Cognito User Pool Client
const { cfnResources } = backend.auth.resources;
const { cfnUserPool, cfnUserPoolClient } = cfnResources;

// Update User Pool Client configuration
cfnUserPoolClient.addPropertyOverride('ClientName', 'mcp-server-static-client');
cfnUserPoolClient.addPropertyOverride('GenerateSecret', false);
cfnUserPoolClient.addPropertyOverride('RefreshTokenValidity', 30);
cfnUserPoolClient.addPropertyOverride('AllowedOAuthFlows', ['code']);
cfnUserPoolClient.addPropertyOverride('AllowedOAuthFlowsUserPoolClient', true);
cfnUserPoolClient.addPropertyOverride('AllowedOAuthScopes', ['openid', 'profile', 'email']);
cfnUserPoolClient.addPropertyOverride('CallbackURLs', [`${apiGatewayUrl}/oauth2/callback`]);
cfnUserPoolClient.addPropertyOverride('LogoutURLs', [`${apiGatewayUrl}/logout`]);
cfnUserPoolClient.addPropertyOverride('SupportedIdentityProviders', ['COGNITO']);
cfnUserPoolClient.addPropertyOverride('PreventUserExistenceErrors', 'ENABLED');
cfnUserPoolClient.addPropertyOverride('EnableTokenRevocation', true);
cfnUserPoolClient.addPropertyOverride('ExplicitAuthFlows', [
  'ALLOW_REFRESH_TOKEN_AUTH',
  'ALLOW_USER_SRP_AUTH'
]);
cfnUserPoolClient.addPropertyOverride('TokenValidityUnits', {
  AccessToken: 'hours',
  IdToken: 'hours',
  RefreshToken: 'days'
});
cfnUserPoolClient.addPropertyOverride('AccessTokenValidity', 1);
cfnUserPoolClient.addPropertyOverride('IdTokenValidity', 1);

console.log('Cognito User Pool ID:', userPoolId);
console.log('Cognito Name:', userPoolName);
console.log('Region:', region);
console.log('API Gateway URL:', apiGatewayUrl);

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

// OAuth2 Registration(/oauth2/register)
const httpLambdaIntegrationOAuth2Registration = new HttpLambdaIntegration(
  "LambdaIntegrationOAuth2Registration",
  backend.oauth2RegistrationFunction.resources.lambda
);

httpApi.addRoutes({
  path: "/oauth2/register",
  methods: [HttpMethod.POST],
  integration: httpLambdaIntegrationOAuth2Registration,
});

// OAuth2 Authorization(/oauth2/authorize)
const httpLambdaIntegrationOAuth2Authorization = new HttpLambdaIntegration(
  "LambdaIntegrationOAuth2Authorization",
  backend.oauth2AuthorizationFunction.resources.lambda
);

httpApi.addRoutes({
  path: "/oauth2/authorize",
  methods: [HttpMethod.GET],
  integration: httpLambdaIntegrationOAuth2Authorization,
});

// OAuth2 Callback(/oauth2/callback)
const httpLambdaIntegrationOAuth2Callback = new HttpLambdaIntegration(
  "LambdaIntegrationOAuth2Callback",
  backend.oauth2CallbackFunction.resources.lambda
);

httpApi.addRoutes({
  path: "/oauth2/callback",
  methods: [HttpMethod.GET],
  integration: httpLambdaIntegrationOAuth2Callback,
});

// OAuth2 Token(/oauth2/token)
const httpLambdaIntegrationOAuth2Token = new HttpLambdaIntegration(
  "LambdaIntegrationOAuth2Token",
  backend.oauth2TokenFunction.resources.lambda
);

httpApi.addRoutes({
  path: "/oauth2/token",
  methods: [HttpMethod.POST],
  integration: httpLambdaIntegrationOAuth2Token,
});