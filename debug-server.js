#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');

console.log('🔍 Debugging Server Connectivity for Real Devices\n');

// Get network interfaces
const networkInterfaces = os.networkInterfaces();
const addresses = [];

for (const [name, interfaces] of Object.entries(networkInterfaces)) {
  for (const iface of interfaces) {
    if (iface.family === 'IPv4' && !iface.internal) {
      addresses.push({ name, address: iface.address });
    }
  }
}

console.log('📱 Your device should be able to reach these IPs:');
addresses.forEach(({ name, address }) => {
  console.log(`   • ${address} (${name})`);
});

const testIP = addresses[0]?.address || '192.168.8.106';
const serverURL = `http://${testIP}:3000`;

console.log(`\n🧪 Testing server connectivity...`);
console.log(`   Server URL: ${serverURL}`);

// Test health endpoint
exec(`curl -s ${serverURL}/health`, (error, stdout, stderr) => {
  if (error) {
    console.log('\n❌ Server Health Check Failed:');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure your backend server is running');
    console.log('   2. Check if the server is listening on port 3000');
    console.log('   3. Verify your firewall allows connections on port 3000');
    console.log('   4. Ensure your device and computer are on the same WiFi');
  } else {
    try {
      const response = JSON.parse(stdout);
      console.log('\n✅ Server Health Check Passed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${response.message}`);
      
      console.log('\n🎯 Next Steps:');
      console.log(`   1. Make sure your Expo app uses: ${serverURL}`);
      console.log('   2. Test payment functionality on your real device');
      console.log('   3. Check device logs for network errors');
    } catch (parseError) {
      console.log('\n⚠️  Server responded but with unexpected format:');
      console.log(`   Response: ${stdout}`);
    }
  }
});

// Test payment endpoint
setTimeout(() => {
  exec(`curl -s -X POST ${serverURL}/payment-sheet -H "Content-Type: application/json" -d '{"amount": 100, "currency": "sek"}'`, (error, stdout, stderr) => {
    console.log('\n💳 Testing Payment Endpoint...');
    if (error) {
      console.log('❌ Payment endpoint test failed:');
      console.log(`   Error: ${error.message}`);
    } else {
      try {
        const response = JSON.parse(stdout);
        if (response.paymentIntent && response.ephemeralKey && response.customer) {
          console.log('✅ Payment endpoint working correctly');
        } else {
          console.log('⚠️  Payment endpoint responded but missing required fields');
          console.log(`   Response keys: ${Object.keys(response)}`);
        }
      } catch (parseError) {
        console.log('❌ Payment endpoint returned invalid JSON');
        console.log(`   Response: ${stdout.substring(0, 200)}...`);
      }
    }
  });
}, 1000);

console.log('\n📋 Configuration Checklist:');
console.log('   □ Backend server running on port 3000');
console.log('   □ Device and computer on same WiFi network');
console.log('   □ Firewall allows port 3000');
console.log('   □ Expo app configured with correct server URL');
console.log(`   □ Server URL in app: ${serverURL}`);