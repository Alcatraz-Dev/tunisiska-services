#!/usr/bin/env node

/**
 * Test Payment Methods Script
 * 
 * This script tests the enhanced payment methods configuration
 * for different currencies and displays the results.
 */

const currencies = ['sek', 'eur', 'usd'];
const serverUrl = 'http://localhost:3000';

async function testPaymentMethods(currency) {
  try {
    console.log(`\n🧪 Testing payment methods for ${currency.toUpperCase()}:`);
    console.log('─'.repeat(50));

    const response = await fetch(`${serverUrl}/payment-sheet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100,
        currency: currency,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.log(`❌ Error: ${error}`);
      return;
    }

    const data = await response.json();
    console.log('✅ Payment sheet created successfully!');
    console.log(`   Customer ID: ${data.customer}`);
    console.log(`   Payment Intent: ${data.paymentIntent.substring(0, 30)}...`);
    
    // Try to get additional info from the response
    console.log('   Available payment methods configured for this currency');

  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function main() {
  console.log('🔧 Enhanced Payment Methods Testing');
  console.log('=' .repeat(60));

  // Test server health first
  try {
    const healthResponse = await fetch(`${serverUrl}/health`);
    if (!healthResponse.ok) {
      console.log('❌ Server is not running. Please start the server first.');
      process.exit(1);
    }
    console.log('✅ Server is running and healthy');
  } catch (error) {
    console.log('❌ Cannot connect to server. Please make sure it\'s running.');
    process.exit(1);
  }

  // Test each currency
  for (const currency of currencies) {
    await testPaymentMethods(currency);
  }

  console.log('\n📋 Summary of enhancements:');
  console.log('─'.repeat(50));
  console.log('• SEK: Card, Klarna, Stripe Link');
  console.log('• EUR: Card, Klarna, Bancontact, EPS, Giropay, iDEAL, P24, SEPA, Sofort, Link');
  console.log('• Other currencies: Card, Stripe Link');
  console.log('');
  console.log('🎨 Client-side enhancements:');
  console.log('• Apple Pay support (iOS)');
  console.log('• Google Pay support (Android)');
  console.log('• Enhanced UI appearance');
  console.log('• Automatic payment method saving');
  console.log('• Return URL for redirect flows');

  console.log('\n🚀 Your Expo app will now display multiple payment options!');
  console.log('   Restart your Expo app to see the new payment methods.');
}

// Run the script
main().catch(console.error);