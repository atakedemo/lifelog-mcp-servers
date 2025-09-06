// lambda/resource-metadata-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export class ResourceMetadataHandler {
    static async handle(event: APIGatewayProxyEvent, baseUrl: string, genericAuthServerUrl: string): Promise<APIGatewayProxyResult> {
        const response = {
            resource: baseUrl,
            authorization_servers: [
                genericAuthServerUrl
            ],
            bearer_methods_supported: [
            "header"
            ],
            scopes_supported: [
                "openid",
                "profile", 
                "email",
                "mcp-api/read",
                "mcp-api/write"
            ],
            resource_documentation: `${baseUrl}/docs`
        }
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
        };   
    }
}