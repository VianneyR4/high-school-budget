#!/usr/bin/env node

/**
 * Setup script to register the School Budget Demo application with the IDP service
 * This script will register your application and provide the client credentials needed
 * for the IDP widget integration.
 */

const https = require('https');
const http = require('http');

const IDP_BASE_URL = 'http://localhost:8080';
const CLIENT_NAME = 'School Budget Demo';

async function makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const response = {
                        statusCode: res.statusCode,
                        data: body ? JSON.parse(body) : null
                    };
                    resolve(response);
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        data: body
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function checkIdpHealth() {
    console.log('🔍 Checking IDP service health...');
    try {
        const response = await makeRequest(`${IDP_BASE_URL}/health`);
        if (response.statusCode === 200) {
            console.log('✅ IDP service is running and healthy');
            return true;
        } else {
            console.log(`❌ IDP service health check failed (Status: ${response.statusCode})`);
            return false;
        }
    } catch (error) {
        console.log(`❌ Cannot connect to IDP service: ${error.message}`);
        console.log('   Make sure the IDP service is running on http://localhost:8080');
        return false;
    }
}

async function registerClient() {
    console.log('📝 Registering School Budget Demo with IDP service...');
    
    const clientData = {
        clientName: CLIENT_NAME,
        redirectUris: [
            'http://localhost:3000/idp-integration.html',
            'http://localhost:3000/auth/callback'
        ],
        scopes: ['openid', 'profile', 'email']
    };

    try {
        const response = await makeRequest(
            `${IDP_BASE_URL}/api/oauth2/clients`,
            'POST',
            clientData
        );

        if (response.statusCode === 200 || response.statusCode === 201) {
            console.log('✅ Client registration successful!');
            console.log('\n📋 Client Credentials:');
            console.log(`   Client ID: ${response.data.clientId}`);
            console.log(`   Client Secret: ${response.data.clientSecret}`);
            
            // Update the IDP integration file with the new credentials
            await updateIdpIntegrationFile(response.data.clientId, response.data.clientSecret);
            
            return response.data;
        } else {
            console.log(`❌ Client registration failed (Status: ${response.statusCode})`);
            console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
            return null;
        }
    } catch (error) {
        console.log(`❌ Error during client registration: ${error.message}`);
        return null;
    }
}

async function updateIdpIntegrationFile(clientId, clientSecret) {
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(__dirname, 'client', 'public', 'idp-integration.html');
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace the placeholder client credentials
        content = content.replace(
            "clientId: 'school-budget-demo-client',",
            `clientId: '${clientId}',`
        );
        content = content.replace(
            "clientSecret: 'demo-secret',",
            `clientSecret: '${clientSecret}',`
        );
        
        fs.writeFileSync(filePath, content);
        console.log('✅ Updated idp-integration.html with new client credentials');
    } catch (error) {
        console.log(`⚠️  Could not update idp-integration.html: ${error.message}`);
        console.log('   Please manually update the file with the client credentials above');
    }
}

async function main() {
    console.log('🚀 School Budget Demo - IDP Client Setup');
    console.log('==========================================\n');
    
    // Check if IDP service is running
    const isHealthy = await checkIdpHealth();
    if (!isHealthy) {
        console.log('\n💡 To start the IDP service:');
        console.log('   1. Navigate to your idp-spring-boot directory');
        console.log('   2. Run: ./mvnw spring-boot:run');
        console.log('   3. Wait for the service to start on http://localhost:8080');
        console.log('   4. Run this setup script again');
        process.exit(1);
    }
    
    // Register the client
    const clientData = await registerClient();
    if (!clientData) {
        console.log('\n❌ Setup failed. Please check the error messages above.');
        process.exit(1);
    }
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Start your React development server: npm start');
    console.log('   2. Navigate to http://localhost:3000');
    console.log('   3. Click "Sign In with Identity Provider" on the login page');
    console.log('   4. Test the authentication flow');
    
    console.log('\n🔧 Integration Details:');
    console.log(`   - IDP Widget URL: ${IDP_BASE_URL}/idp-widget/`);
    console.log(`   - Integration Page: http://localhost:3000/idp-integration.html`);
    console.log(`   - JWKS Endpoint: ${IDP_BASE_URL}/.well-known/jwks.json`);
}

// Run the setup
main().catch(error => {
    console.error('❌ Setup failed with error:', error);
    process.exit(1);
});







                //   const widget = new IdPWidget({ 
                //   containerId: 'idp-widget', 
                //   apiBaseUrl: 'https://your-idp.com/api', 
                //   clientId: 'your-client-id', 
                //   onSuccess: (user, tokens) => { 
                //     // Handle successful authentication 
                //     console.log('User logged in:', user); 
                //   }, onError: (error) => { 
                //     // Handle authentication errors 
                //     console.error('Auth error:', error); 
                //   } }); 