// lambda/resource-metadata-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';// import { config } from '../config/';

export class AuthorizationServerHandler {
    static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
          const baseUrl = process.env.BASE_URL || '';
          const awsRegion = process.env.AWS_REGION || 'ap-northeast-1';
          const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID || '';
          
          const metadata = {
              issuer: baseUrl,
              authorization_endpoint: `${baseUrl}/oauth2/authorize`,
              registration_endpoint: `${baseUrl}/register`,
              jwks_uri: `https://cognito-idp.${awsRegion}.amazonaws.com/${cognitoUserPoolId}/.well-known/jwks.json`,
              response_types_supported: ['code'],
              grant_types_supported: ['authorization_code', 'refresh_token'],
              code_challenge_methods_supported: ['S256'],
              scopes_supported: ['openid', 'profile', 'email'],
              token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
              service_documentation: `${baseUrl}/docs`,
              ui_locales_supported: ['en-US'],
              token_endpoint: `${baseUrl}/oauth2/token`,
          };
            
          console.log(metadata)
          return {
            statusCode: 200,
            headers: { 
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=3600'
            },
            body: JSON.stringify(metadata),
          };
        } catch(error) {
            console.error('Authorization-server-handler Error:', error);
            return {
              statusCode: 500,
              headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600'
              },
              body: JSON.stringify({ error: 'Internal Server Error' }),
            };
        }
    }
}

// Lambda function entry point
export const handler = async (event: any) => {
    return AuthorizationServerHandler.handle(event);
};