// lambda/oauth2-authorization-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export class OAuth2AuthorizationHandler {
    static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const baseUrl = process.env.BASE_URL || '';
            const cognitoDomain = process.env.COGNITO_DOMAIN || '';

            const query = event.queryStringParameters || {};

            // Store original redirect URI in state
            const proxyState = Buffer.from(
                JSON.stringify({
                    redirect_uri: query.redirect_uri,
                    original_state: query.state,
                    original_client_id: query.client_id,
                }),
            ).toString('base64');

            const redirectUrl = `${cognitoDomain}/oauth2/authorize?${new URLSearchParams({
                response_type: 'code',
                client_id: query.client_id || '',
                redirect_uri: `${baseUrl}/oauth2/callback`,
                scope: query.scope || 'openid',
                state: proxyState,
                code_challenge: query.code_challenge || '',
                code_challenge_method: 'S256',
            }).toString()}`;

            return {
                statusCode: 302,
                headers: {
                    'Location': redirectUrl,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
                body: '',
            };
          
        } catch(error) {
            console.error('OAuth2 Authorization Handler Error:', error);
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
    return OAuth2AuthorizationHandler.handle(event);
};