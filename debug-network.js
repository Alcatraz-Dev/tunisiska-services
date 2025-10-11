// Add this to your wallet page temporarily to test network connectivity

const NetworkTest = () => {
  const testConnection = async () => {
    const serverUrl = 'http://192.168.8.106:3000';
    
    console.log('🧪 [NETWORK TEST] Starting connection test...');
    console.log('📱 [DEVICE INFO] Platform:', Platform.OS);
    console.log('🌐 [SERVER] Testing:', serverUrl);
    
    try {
      // Test 1: Basic health check
      console.log('🏥 [TEST 1] Health check...');
      const healthResponse = await fetch(`${serverUrl}/health`);
      console.log('✅ [TEST 1] Health status:', healthResponse.status);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ [TEST 1] Health data:', healthData);
      }
      
      // Test 2: Payment endpoint
      console.log('💳 [TEST 2] Payment endpoint...');
      const paymentResponse = await fetch(`${serverUrl}/payment-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: 100, currency: 'sek' })
      });
      
      console.log('✅ [TEST 2] Payment status:', paymentResponse.status);
      
      if (paymentResponse.ok) {
        const paymentData = await paymentResponse.json();
        console.log('✅ [TEST 2] Payment keys:', Object.keys(paymentData));
        
        Alert.alert(
          '🎉 Network Test SUCCESS',
          `Server is reachable!\\n\\nHealth: ${healthResponse.status}\\nPayment: ${paymentResponse.status}\\n\\nYour real device can connect to the server. The issue might be elsewhere.`
        );
      } else {
        throw new Error(`Payment endpoint returned ${paymentResponse.status}`);
      }
      
    } catch (error) {
      console.error('💥 [NETWORK TEST] Error:', error.message);
      
      Alert.alert(
        '❌ Network Test FAILED',
        `Cannot reach server\\n\\nError: ${error.message}\\n\\nTroubleshooting:\\n• Check WiFi connection\\n• Ensure same network as computer\\n• Verify server is running\\n• Try restarting Expo`
      );
    }
  };
  
  return (
    <TouchableOpacity onPress={testConnection}>
      <Text>🧪 Test Network Connection</Text>
    </TouchableOpacity>
  );
};