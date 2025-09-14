// lambda/mcp-handler.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { JwtVerifier } from './jwt-verifier';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export class McpHandler {
  static async handle(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const unAuthorizedHeader = {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer resource_metadata="${process.env.BASE_URL}/.well-known/oauth-protected-resource"`
    }

    try {
      // Authorization headerからトークンを取得
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers: unAuthorizedHeader,
          body: JSON.stringify({ error: 'Unauthorized' }),
        };
      }

      const token = authHeader.substring(7);
      
      // JWTトークンを検証
      const payload = await JwtVerifier.verify(token);
      if (!payload) {
        return {
          statusCode: 401,
          headers: unAuthorizedHeader,
          body: JSON.stringify({ error: 'Invalid token' }),
        };
      }

      // クライアント情報を取得
      const clientId = payload.client_id;
      const client = await this.getClient(clientId);
      if (!client) {
        return {
          statusCode: 401,
          headers: unAuthorizedHeader,
          body: JSON.stringify({ error: 'Client not found' }),
        };
      }

      // MCPリクエストを処理
      const requestBody = JSON.parse(event.body || '{}');
      const response = await this.processMcpRequest(requestBody, client);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(response),
      };
    } catch (error) {
      console.error('MCP handler error:', error);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Internal Server Error' }),
      };
    }
  }

  private static async getClient(clientId: string) {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: process.env.CLIENT_TABLE_NAME,
          Key: { clientId },
        })
      );
      return result.Item;
    } catch (error) {
      console.error('Error getting client:', error);
      return null;
    }
  }

  private static async processMcpRequest(request: any, client: any) {
    // MCPプロトコルに基づいてリクエストを処理
    const { method, params, id } = request;

    try {
      switch (method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {
                  listChanged: true
                }
              },
              serverInfo: {
                name: 'simple-calculator-mcp-server',
                version: '1.0.0'
              }
            }
          };

        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              tools: [
                {
                  name: 'add_numbers',
                  description: 'Add two numbers together',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      a: {
                        type: 'number',
                        description: 'First number to add'
                      },
                      b: {
                        type: 'number',
                        description: 'Second number to add'
                      }
                    },
                    required: ['a', 'b']
                  }
                }
              ]
            }
          };

        case 'tools/call':
          if (params.name === 'add_numbers') {
            const { a, b } = params.arguments;
            const result = a + b;
            
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: `The result of ${a} + ${b} = ${result}`
                  }
                ]
              }
            };
          }
          break;

        case 'ping':
          return {
            jsonrpc: '2.0',
            id,
            result: {}
          };

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          };
      }
    } catch (error) {
      console.error('Error processing MCP request:', error);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error'
        }
      };
    }

    // Fallback response
    return {
      jsonrpc: '2.0',
      id,
      result: {
        message: 'MCP request processed successfully'
      }
    };
  }
}

// Lambda function entry point
export const handler = async (event: any) => {
  return McpHandler.handle(event);
};