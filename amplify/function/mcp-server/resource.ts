import { defineFunction } from '@aws-amplify/backend';

export const mcpServerFunction = (baseUrl: string) => {
    return defineFunction({
        name: 'mcp-server',
        entry: './mcp-handler.ts',
        timeoutSeconds: 30,
        runtime: 20,
        memoryMB: 512,
        environment: {
            "BASE_URL": baseUrl
        }
    })
}

export const resourceMetadataHandlerFunction = (baseUrl: string, authServerUrl: string) => {
    return defineFunction({
        name: 'resource-metadata-handler',
        entry: './resource-metadata-handler.ts',
        timeoutSeconds: 30,
        runtime: 20,
        memoryMB: 512,
        environment: {
            "BASE_URL": baseUrl,
            "AUTH_SERVER_URL": authServerUrl
        }
    })
}

export const authorizationServerHandlerFunction = (authServerUrl: string) => {
    return defineFunction({
        name: 'authorization-server-handler',
        entry: './authorization-server-handler.ts',
        timeoutSeconds: 30,
        runtime: 20,
        memoryMB: 512,
        environment: {
            "AUTH_SERVER_URL": authServerUrl
        }
    })
}