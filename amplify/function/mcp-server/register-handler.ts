// lambda/register-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';// import { config } from '../config/';

export class RegisterHandler {
    static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const requestBody = JSON.parse(event.body || '{}');
            const cognitoUserPoolClientId = process.env.COGNITO_USER_POOL_CLIENT_ID || '';
          
            const response = {
                client_id: cognitoUserPoolClientId,
                client_secret: 'not_required',
                client_id_issued_at: Math.floor(Date.now() / 1000),
                redirect_uris: requestBody.redirect_uris,
                grant_types: requestBody.grant_types || ['authorization_code'],
                response_types: requestBody.response_types || ['code'],
                token_endpoint_auth_method: 'none',
                client_name: requestBody.client_name || 'MCP Client',
            };
            
            console.log(response)
            return {
                statusCode: 200,
                headers: { 
                'Content-Type': 'application/json'
                },
            body: JSON.stringify(response),
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
    return RegisterHandler.handle(event);
};