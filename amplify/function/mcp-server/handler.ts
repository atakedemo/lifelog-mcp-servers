import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import { McpHandler } from './mcp-handler';
import { DcrHandler } from './dcr-handler';
import { ClientHandler } from './client-handler';
// import { TokenHandler } from './token-handler';
// import { OAuth21Handler } from './oauth21-handler';

const client = generateClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    console.log(`Handling request: ${method} ${path}`);

    // ルーティング
    if (path === '/mcp' && method === 'POST') {
      return await McpHandler.handle(event);
    } 

    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      },
      body: JSON.stringify({ error: 'Not Found' }),
    };
  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      },
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};