// lambda/oauth2-authorization-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export class OAuth2TokenHandler {
    static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const baseUrl = process.env.BASE_URL || '';
            const cognitoClientId = process.env.COGNITO_CLIENT_ID || '';
            const requestBody = JSON.parse(event.body || '{}');
            let cognitoRequestBody = {};
            
            if(requestBody.grant_type === 'authorization_code') {
                cognitoRequestBody = {
                    grant_type: 'authorization_code',
                    code: requestBody.code,
                    redirect_uri: baseUrl + '/oauth2/callback',
                    client_id: cognitoClientId,
                    code_verifier: requestBody.code_verifier,
                };
            } else {
                cognitoRequestBody = {
                    grant_type: 'refresh_token',
                    refresh_token: requestBody.refresh_token,
                    client_id: cognitoClientId,
                };
                if(requestBody.scope) {
                    cognitoRequestBody= { scope: requestBody.scope };
                }
            }

            const cognitoResponse = await fetch(baseUrl + '/oauth2/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'x-www-form-urlencoded',
                },
                body: new URLSearchParams(cognitoRequestBody).toString(),
            });

            const cognitoTokenResponse = await cognitoResponse.json();

            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody.resource ? 
                    {...cognitoTokenResponse, resource: requestBody.resource} : cognitoTokenResponse
                ),
            };
          
        } catch(error) {
            console.error('OAuth2 Authorization Token Handler Error:', error);
            return {
              statusCode: 500,
              headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              },
              body: JSON.stringify({ error: 'Internal Server Error' }),
            };
        }
    }
}

// Lambda function entry point
export const handler = async (event: any) => {
    return OAuth2TokenHandler.handle(event);
};