#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

// Colors for console output
const colors = {
  expo: '\x1b[36m', // Cyan
  server: '\x1b[33m', // Yellow
  reset: '\x1b[0m'
};

console.log('🚀 Starting development environment...\n');

// Start Expo
const expoProcess = spawn('npx', ['expo', 'start'], {
  stdio: 'pipe',
  env: { ...process.env, METRO_DISABLE_WATCHMAN: '1' },
  shell: true
});

// Start server after a short delay to let Expo initialize
setTimeout(() => {
  const serverProcess = spawn('node', ['server.mjs'], {
    stdio: 'pipe',
    shell: true
  });

  // Handle server output
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`${colors.server}[SERVER]${colors.reset} ${output}`);
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`${colors.server}[SERVER ERROR]${colors.reset} ${output}`);
    }
  });

  serverProcess.on('close', (code) => {
    console.log(`${colors.server}[SERVER]${colors.reset} Process exited with code ${code}`);
  });

  // Clean shutdown
  const cleanup = () => {
    console.log('\n🛑 Shutting down processes...');
    serverProcess.kill();
    expoProcess.kill();
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}, 2000);

// Handle Expo output
expoProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    console.log(`${colors.expo}[EXPO]${colors.reset} ${output}`);
  }
});

expoProcess.stderr.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    console.error(`${colors.expo}[EXPO ERROR]${colors.reset} ${output}`);
  }
});

expoProcess.on('close', (code) => {
  console.log(`${colors.expo}[EXPO]${colors.reset} Process exited with code ${code}`);
});

// Clean shutdown
const cleanup = () => {
  console.log('\n🛑 Shutting down processes...');
  expoProcess.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);