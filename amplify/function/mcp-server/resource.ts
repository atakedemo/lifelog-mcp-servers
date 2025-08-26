import { defineFunction } from '@aws-amplify/backend';

export const mcpServerFunction = defineFunction({
    name: 'mcp-server',
    entry: './handler.ts',
    timeoutSeconds: 30,
    runtime: 20,
    memoryMB: 512
})