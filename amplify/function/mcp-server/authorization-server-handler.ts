// lambda/resource-metadata-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';// import { config } from '../config/';

export class AuthorizationServerHandler {
    static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        try {
            // Proxy request to the actual Cognito authorization server metadata
            const axios = require('axios');
            
            // Cognito uses OpenID Connect configuration, not OAuth authorization server endpoint
            // Convert the configured auth server URL to the correct OpenID configuration endpoint
            let cognitoMetadataUrl = process.env.AUTH_SERVER_URL || '';
            
            // If the configured URL points to oauth-authorization-server, change it to openid-configuration
            if (cognitoMetadataUrl.includes('/.well-known/oauth-authorization-server')) {
              cognitoMetadataUrl = cognitoMetadataUrl.replace('/.well-known/oauth-authorization-server', '/.well-known/openid-configuration');
            }
            // If it doesn't have any well-known endpoint, add the OpenID configuration one
            else if (!cognitoMetadataUrl.includes('/.well-known/')) {
              cognitoMetadataUrl = `${cognitoMetadataUrl}/.well-known/openid-configuration`;
            }
            
            console.log(`Proxying authorization server metadata request to: ${cognitoMetadataUrl}`);
            const response = await axios.get(cognitoMetadataUrl);
            
            // Add registration_endpoint to the metadata for RFC 8414 compliance
            const metadata = response.data;
            metadata.registration_endpoint = process.env.DCR_ENDPOINT;
            
            // Add PKCE support indication if not already present
            // AWS Cognito supports PKCE but doesn't advertise it in metadata
            if (!metadata.code_challenge_methods_supported) {
              metadata.code_challenge_methods_supported = ['S256'];
            }
            console.log(metadata)
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(metadata),
            };
        } catch(error) {
            console.error('Authorization-server-handler Error:', error);
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Internal Server Error' }),
            };
        }
    }
}

// Lambda function entry point
export const handler = async (event: any) => {
    return AuthorizationServerHandler.handle(event);
};