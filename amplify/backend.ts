import { defineBackend } from '@aws-amplify/backend';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "aws-cdk-lib/aws-apigatewayv2";

import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { Duration } from "aws-cdk-lib";

import { auth } from './auth/resource';
import { data } from './data/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
});

// create a new API stack
const apiStack = backend.createStack("api-stack");

// Create Lambda functions with CDK to access Cognito resources
const mcpServerLambda = new Function(apiStack, "McpServerFunction", {
  runtime: Runtime.NODEJS_20_X,
  handler: "mcp-handler.handler",
  code: Code.fromAsset("amplify/function/mcp-server"),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    BASE_URL: `https://${apiStack.stackName}.execute-api.ap-northeast-1.amazonaws.com`,
    COGNITO_DOMAIN_URL: `https://cognito-idp.ap-northeast-1.amazonaws.com/${backend.auth.resources.userPool.userPoolId}`,
  },
});

const resourceMetadataLambda = new Function(apiStack, "ResourceMetadataFunction", {
  runtime: Runtime.NODEJS_20_X,
  handler: "resource-metadata-handler.handler",
  code: Code.fromAsset("amplify/function/mcp-server"),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    BASE_URL: `https://${apiStack.stackName}.execute-api.ap-northeast-1.amazonaws.com`,
  },
});

const authorizationServerLambda = new Function(apiStack, "AuthorizationServerFunction", {
  runtime: Runtime.NODEJS_20_X,
  handler: "authorization-server-handler.handler",
  code: Code.fromAsset("amplify/function/mcp-server"),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    BASE_URL: `https://${apiStack.stackName}.execute-api.ap-northeast-1.amazonaws.com`,
    AWS_REGION: "ap-northeast-1",
    COGNITO_USER_POOL_ID: backend.auth.resources.userPool.userPoolId,
  },
});

const registerLambda = new Function(apiStack, "RegisterFunction", {
  runtime: Runtime.NODEJS_20_X,
  handler: "register-handler.handler",
  code: Code.fromAsset("amplify/function/mcp-server"),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    COGNITO_USER_POOL_CLIENT_ID: backend.auth.resources.userPoolClient.userPoolClientId,
  },  
});

const oauth2AuthorizationLambda = new Function(apiStack, "OAuth2AuthorizationFunction", {
  runtime: Runtime.NODEJS_20_X,
  handler: "oauth2-authorization-handler.handler",
  code: Code.fromAsset("amplify/function/mcp-server"),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    BASE_URL: `https://${apiStack.stackName}.execute-api.ap-northeast-1.amazonaws.com`,
    COGNITO_DOMAIN: `https://cognito-idp.ap-northeast-1.amazonaws.com/${backend.auth.resources.userPool.userPoolId}`,
  },
});

const callbackLambda = new Function(apiStack, "CallbackFunction", {
  runtime: Runtime.NODEJS_20_X,
  handler: "callback-handler.handler",
  code: Code.fromAsset("amplify/function/mcp-server"),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    BASE_URL: `https://${apiStack.stackName}.execute-api.ap-northeast-1.amazonaws.com`,
  },
});


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
  mcpServerLambda
);

httpApi.addRoutes({
  path: "/mcp",
  methods: [HttpMethod.POST],
  integration: httpLambdaIntegrationMcp,
});

// Resource Metadata(/resource-metadata)
const httpLambdaIntegrationResourceMetadata = new HttpLambdaIntegration(
  "LambdaIntegrationResourceMetadata",
  resourceMetadataLambda
);

httpApi.addRoutes({
  path: "/.well-known/oauth-protected-resource",
  methods: [HttpMethod.GET],
  integration: httpLambdaIntegrationResourceMetadata,
});

// Authorization Server(/authorization-server)
const httpLambdaIntegrationAuthorizationServer = new HttpLambdaIntegration(
  "LambdaIntegrationAuthorizationServer",
  authorizationServerLambda
);

httpApi.addRoutes({
  path: "/.well-known/oauth-authorization-server",
  methods: [HttpMethod.GET],
  integration: httpLambdaIntegrationAuthorizationServer,
});

// Register(/register)
const httpLambdaIntegrationRegister = new HttpLambdaIntegration(
  "LambdaIntegrationRegister",
  registerLambda
);

httpApi.addRoutes({
  path: "/register",
  methods: [HttpMethod.POST],
  integration: httpLambdaIntegrationRegister,
});

// OAuth2 Authorization(/oauth2/authorize)
const httpLambdaIntegrationOAuth2Authorization = new HttpLambdaIntegration(
  "LambdaIntegrationOAuth2Authorization",
  oauth2AuthorizationLambda
);

httpApi.addRoutes({
  path: "/oauth2/authorize",
  methods: [HttpMethod.GET],
  integration: httpLambdaIntegrationOAuth2Authorization,
});

// OAuth2 Callback(/oauth2/callback)
const httpLambdaIntegrationOAuth2Callback = new HttpLambdaIntegration(
  "LambdaIntegrationOAuth2Callback",
  callbackLambda
);

httpApi.addRoutes({
  path: "/oauth2/callback",
  methods: [HttpMethod.GET],
  integration: httpLambdaIntegrationOAuth2Callback,
});

// Callback(/oauth2/callback)
// const httpLambdaIntegrationCallback = new HttpLambdaIntegration(
//   "LambdaIntegrationCallback",
//   backend.callbackFunction.resources.lambda
// );

// httpApi.addRoutes({
//   path: "/oauth2/callback",
//   methods: [HttpMethod.GET],
//   integration: httpLambdaIntegrationCallback,
// });