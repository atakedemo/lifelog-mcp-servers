// lambda/resource-metadata-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { config } from '../config/';

export class ResourceMetadataHandler {
    static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
        const response = {
            resource: config.baseUrl,
            authorization_servers: [
                config.genericAuthServerUrl
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
            resource_documentation: `${config.baseUrl}/docs`
        }
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
        };   
    }
}