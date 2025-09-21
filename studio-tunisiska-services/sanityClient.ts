// lib/sanity.ts
import { createClient } from '@sanity/client';

// Make sure these environment variables are set in your app.config.js
const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID || "ci4uj541";
const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.EXPO_PUBLIC_SANITY_TOKEN;

if (!projectId) {
  console.error('❌ Sanity project ID is missing');
}

if (!token) {
  console.warn('⚠️ Sanity token is missing - write operations will fail');
}

export const client = createClient({
  projectId,
  dataset,
  useCdn: false, // Important for real-time updates
  token,
  apiVersion: '2023-05-03',
  
});