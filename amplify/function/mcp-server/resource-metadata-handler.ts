// lambda/resource-metadata-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export class ResourceMetadataHandler {
    static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        const baseUrl = process.env.BASE_URL || '';
        // const authServerUrl = process.env.AUTH_SERVER_URL || '';
        
        const response = {
            resource: baseUrl,
            authorization_servers: [baseUrl],
            bearer_methods_supported: ["header"],
            scopes_supported: [
                "openid",
                "profile", 
                "email",
                "mcp-api/read",
                "mcp-api/write"
            ],
            resource_signing_alg_values_supported: ['RS256', 'ES256'],
            resource_documentation: `${baseUrl}/docs`
        }
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
        };   
    }
}

// Lambda function entry point
export const handler = async (event: any) => {
    return ResourceMetadataHandler.handle(event);
};