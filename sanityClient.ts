// lib/sanity.ts
import { createClient } from "@sanity/client";
import Constants from 'expo-constants';

// Resolve Expo config (supports older Expo too)
const expoConfig = Constants.expoConfig || Constants.manifest;
//ts-ignore
// const extra = (expoConfig?.extra  as any ) || {} ;
// const sanityExtra = (extra?.sanity as any) || {};
const isDev = __DEV__;

// Environment variable handling with proper fallbacks
const projectId = process.env.EXPO_PUBLIC_SANITY_PROJECT_ID || "";
const dataset = process.env.EXPO_PUBLIC_SANITY_DATASET || "";
const token = process.env.EXPO_PUBLIC_SANITY_TOKEN || "";

if (!projectId) {
  console.error("❌ Sanity project ID is missing. Set EXPO_PUBLIC_SANITY_PROJECT_ID or extra.sanity.projectId in app.config.js");
  throw new Error('EXPO_PUBLIC_SANITY_PROJECT_ID is required');
}

if (!dataset) {
  console.error("❌ Sanity dataset is missing. Set EXPO_PUBLIC_SANITY_DATASET or extra.sanity.dataset in app.config.js");
  throw new Error('EXPO_PUBLIC_SANITY_DATASET is required');
}

if (!token) {
  console.warn("⚠️ Sanity token not provided. Ensure your dataset allows public reads or fetch via a secure proxy.");
}

// Log environment info for debugging (never print secrets)
console.log('🔧 Sanity Config:', {
  projectId: projectId ? '✅ Set' : '❌ Missing',
  dataset: dataset ? '✅ Set' : '❌ Missing', 
  token: token ? '✅ Set' : '❌ Missing',
  isDev,
  env: process.env.NODE_ENV
});

export const client = createClient({
  projectId,
  dataset,
  // Use CDN in production (faster, anonymous reads if dataset is public). In dev, hit API directly for latest content.
  useCdn: false, // Temporarily disabled for debugging
  token,
  apiVersion: "2023-05-03",
  ignoreBrowserTokenWarning: true,
});
