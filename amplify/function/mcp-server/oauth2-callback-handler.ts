// lambda/oauth2-authorization-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export class OAuth2CallbackHandler {
    static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            const query = event.queryStringParameters || {};
            const code = query.code || '';
            const state = query.state || '';
            const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
            const redirectUrl = new URL(decodedState.redirect_uri);
            redirectUrl.searchParams.set('code', code);
            redirectUrl.searchParams.set('state', state);

            return {
                statusCode: 302,
                headers: {
                    'Location': redirectUrl.toString(),
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                },
                body: '',
            };
          
        } catch(error) {
            console.error('OAuth2 Authorization Callback Handler Error:', error);
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
    return OAuth2CallbackHandler.handle(event);
};