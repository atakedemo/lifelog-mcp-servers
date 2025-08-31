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
import { mcpServerFunction } from './function/mcp-server/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  mcpServerFunction,
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

const httpLambdaIntegration = new HttpLambdaIntegration(
  "LambdaIntegration",
  backend.mcpServerFunction.resources.lambda
);

httpApi.addRoutes({
  path: "/mcp",
  methods: [HttpMethod.POST],
  integration: httpLambdaIntegration,
  // authorizer: iamAuthorizer,
});

