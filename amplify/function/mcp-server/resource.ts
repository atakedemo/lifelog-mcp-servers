import { defineFunction } from '@aws-amplify/backend';

export const mcpServerFunction = (baseUrl: string) => {
    return defineFunction({
        name: 'mcp-server',
        entry: './handler.ts',
        timeoutSeconds: 30,
        runtime: 20,
        memoryMB: 512,
        environment: {
            "BASE_URL": baseUrl
        }
    })
}

export const resourceMetadataHandlerFunction = defineFunction({
    name: 'resource-metadata-handler',
    entry: './resource-metadata-handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512,
})