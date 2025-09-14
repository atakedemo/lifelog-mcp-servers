// lambda/oauth2-authorization-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as crypto from 'crypto';

export class OAuth2AuthorizationHandler {
    static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const baseUrl = process.env.BASE_URL || '';
            const cognitoDomain = process.env.COGNITO_DOMAIN || '';
            const clientSecret = process.env.COGNITO_CLIENT_SECRET || '';

            const query = event.queryStringParameters || {};
            const clientId = query.client_id || '';

            // Calculate SECRET_HASH if client secret is available
            let secretHash = '';
            if (clientSecret && clientId) {
                secretHash = crypto
                    .createHmac('sha256', clientSecret)
                    .update(clientId + '6a509ls22ndc8seit9nafit57k') // Use the actual client ID from error
                    .digest('base64');
            }

            // Store original redirect URI in state
            const proxyState = Buffer.from(
                JSON.stringify({
                    redirect_uri: query.redirect_uri,
                    original_state: query.state,
                    original_client_id: query.client_id,
                }),
            ).toString('base64');

            const params: Record<string, string> = {
                response_type: 'code',
                client_id: clientId,
                redirect_uri: `${baseUrl}/oauth2/callback`,
                scope: query.scope || 'openid',
                state: proxyState,
                code_challenge: query.code_challenge || '',
                code_challenge_method: 'S256',
            };

            // Add SECRET_HASH if available
            if (secretHash) {
                params.secret_hash = secretHash;
            }

            const redirectUrl = `${cognitoDomain}/oauth2/authorize?${new URLSearchParams(params).toString()}`;

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