import dotenv from "dotenv";

dotenv.config();
// Helper function to extract domain prefix
function extractCognitoDomainPrefix(domainUrl: string) {
    // Remove protocol and .auth.region.amazoncognito.com
    const urlWithoutProtocol = domainUrl.replace(/^https?:\/\//, '');
    const domainPrefix = urlWithoutProtocol.split('.')[0];
    return domainPrefix;
}

export const config = {
    baseUrl: process.env.BASE_URL? process.env.BASE_URL: 'https://gyeullwak1.execute-api.ap-northeast-1.amazonaws.com',
    genericAuthServerUrl: process.env.BASE_URL? process.env.BASE_URL: 'https://gyeullwak1.execute-api.ap-northeast-1.amazonaws.com',
    cognito: {
        region: process.env.COGNITO_REGION || 'us-east-1',
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        clientId: process.env.COGNITO_CLIENT_ID,
        
        // Extract domain prefix from full domain URL
        domain: process.env.COGNITO_DOMAIN 
          ? extractCognitoDomainPrefix(process.env.COGNITO_DOMAIN): '',
        
        // Full domain URL
        domainUrl: `https://${process.env.COGNITO_DOMAIN}`,
        
        // Construct the issuer URL
        issuer: process.env.COGNITO_ISSUER || 
          `https://cognito-idp.${process.env.COGNITO_REGION || 'us-east-1'}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
        
        // Construct the full authorization server metadata URL
        authServerUrl: (() => {
          // If COGNITO_AUTH_SERVER_URL is explicitly set, use it
          if (process.env.COGNITO_AUTH_SERVER_URL) {
            return process.env.COGNITO_AUTH_SERVER_URL;
          }
          
          // Construct the URL manually if not set
          const region = process.env.COGNITO_REGION || 'us-east-1';
          const userPoolId = process.env.COGNITO_USER_POOL_ID;
          
          if (!region || !userPoolId) {
            console.warn('Missing Cognito region or user pool ID for constructing auth server URL');
            return '';
          }
          
          return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/openid-configuration`
        })()
    },
}