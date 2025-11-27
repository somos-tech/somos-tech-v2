/**
 * Test script to send an email via Azure Communication Services
 * Run with: node scripts/test-email-send.js
 */

import { EmailClient } from '@azure/communication-email';

const connectionString = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING;

if (!connectionString) {
    console.error('❌ AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING not set');
    console.log('Set it with:');
    console.log('$env:AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING = "your-connection-string"');
    process.exit(1);
}

async function sendTestEmail() {
    try {
        console.log('📧 Creating email client...');
        const emailClient = new EmailClient(connectionString);
        
        const senderAddress = 'DoNotReply@somos.tech';
        const recipientAddress = 'jcruz@somos.tech';
        
        const emailMessage = {
            senderAddress: senderAddress,
            content: {
                subject: 'Test Email from SOMOS.tech',
                plainText: 'This is a test email from the SOMOS.tech notification system.',
                html: '<h1>Test Email</h1><p>This is a test email from the SOMOS.tech notification system.</p>'
            },
            recipients: {
                to: [{ address: recipientAddress }]
            }
        };
        
        console.log(`📧 Sending email from ${senderAddress} to ${recipientAddress}...`);
        
        const poller = await emailClient.beginSend(emailMessage);
        console.log('📧 Polling for result...');
        
        const result = await poller.pollUntilDone();
        
        console.log('✅ Email result:', JSON.stringify(result, null, 2));
        
        if (result.status === 'Succeeded') {
            console.log('✅ Email sent successfully!');
        } else {
            console.log(`⚠️ Email status: ${result.status}`);
            if (result.error) {
                console.error('Error:', result.error);
            }
        }
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        console.error('Full error:', error);
    }
}

sendTestEmail();
