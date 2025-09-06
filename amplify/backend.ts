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

import { auth } from './auth/resource';
import { data } from './data/resource';
import { 
  mcpServerFunction, 
  resourceMetadataHandlerFunction,
  authorizationServerHandlerFunction
} from './function/mcp-server/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backendBase = defineBackend({
  auth,
  data,
});
// create a new API stack
const apiStack = backendBase.createStack("api-stack");
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

const backendFunctions = defineBackend({
  mcpServerFunction: mcpServerFunction(
    `https://cognito-idp.ap-northeast-1.amazonaws.com/${backendBase.auth.resources.userPool.userPoolId}/.well-known/jwks.json`
  ),
  resourceMetadataHandlerFunction: resourceMetadataHandlerFunction(
    `https://cognito-idp.ap-northeast-1.amazonaws.com/${backendBase.auth.resources.userPool.userPoolId}/.well-known/jwks.json`, 
    `https://cognito-idp.ap-northeast-1.amazonaws.com/${backendBase.auth.resources.userPool.userPoolId}/.well-known/oauth-authorization-server`
  ),
  authorizationServerHandlerFunction: authorizationServerHandlerFunction(
    `https://cognito-idp.ap-northeast-1.amazonaws.com/${backendBase.auth.resources.userPool.userPoolId}/.well-known/oauth-authorization-server`
  ),
})

const httpLambdaIntegration = new HttpLambdaIntegration(
  "LambdaIntegration",
  backendFunctions.mcpServerFunction.resources.lambda
);

httpApi.addRoutes({
  path: "/mcp",
  methods: [HttpMethod.POST],
  integration: httpLambdaIntegration,
  // authorizer: iamAuthorizer,
});

