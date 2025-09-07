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
  code: Code.fromAsset("amplify/function/mcp-server", {
    bundling: {
      image: Runtime.NODEJS_20_X.bundlingImage,
      command: [
        'bash', '-c',
        'npm install && cp -r . /asset-output/'
      ],
    },
  }),
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
  code: Code.fromAsset("amplify/function/mcp-server", {
    bundling: {
      image: Runtime.NODEJS_20_X.bundlingImage,
      command: [
        'bash', '-c',
        'npm install && cp -r . /asset-output/'
      ],
    },
  }),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    BASE_URL: `https://${apiStack.stackName}.execute-api.ap-northeast-1.amazonaws.com`,
    AUTH_SERVER_URL: `https://cognito-idp.ap-northeast-1.amazonaws.com/${backend.auth.resources.userPool.userPoolId}/.well-known/oauth-authorization-server`,
  },
});

const authorizationServerLambda = new Function(apiStack, "AuthorizationServerFunction", {
  runtime: Runtime.NODEJS_20_X,
  handler: "authorization-server-handler.handler",
  code: Code.fromAsset("amplify/function/mcp-server", {
    bundling: {
      image: Runtime.NODEJS_20_X.bundlingImage,
      command: [
        'bash', '-c',
        'npm install && cp -r . /asset-output/'
      ],
    },
  }),
  timeout: Duration.seconds(30),
  memorySize: 512,
  environment: {
    AUTH_SERVER_URL: `https://cognito-idp.ap-northeast-1.amazonaws.com/${backend.auth.resources.userPool.userPoolId}/.well-known/oauth-authorization-server`,
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