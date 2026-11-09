// lib/sanity.ts
import { createClient, type ClientConfig } from "@sanity/client";
import { Platform } from "react-native";
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

const SANITY_HOST = `https://${projectId}.api.sanity.io`;

/**
 * Web reads and writes go through the API server's `/api/sanity` gateway.
 *
 * A browser may only call `*.api.sanity.io` when the page's origin is in the
 * Sanity project's CORS allowlist. The deployed web build is not in it, so
 * calling Sanity directly failed with a CORS error and every screen stayed
 * empty. The gateway proxies the same paths server-side, where no CORS check
 * exists, and signs them with the project token.
 *
 * Native builds keep talking to Sanity directly: they are not subject to CORS.
 */
const API_BASE = (process.env.EXPO_PUBLIC_SERVER_URL || "").replace(/\/$/, "");
const useGateway = Platform.OS === "web" && API_BASE.length > 0;

/**
 * Points the client's HTTP layer at the gateway instead of Sanity's host.
 *
 * `_requestHandler` is the client's request hook: it sees every resolved request
 * (url, method, body) right before it goes out, so rewriting the origin here
 * covers queries and mutations alike without patching anything global.
 */
const gatewayRequestHandler: NonNullable<ClientConfig["_requestHandler"]> = (
  request,
  defaultRequester,
) => {
  if (request.url.startsWith(`${SANITY_HOST}/`)) {
    return defaultRequester({
      ...request,
      url: `${API_BASE}/api/sanity${request.url.slice(SANITY_HOST.length)}`,
    });
  }
  return defaultRequester(request);
};

// Log environment info for debugging (never print secrets)
console.log('🔧 Sanity Config:', {
  projectId: projectId ? '✅ Set' : '❌ Missing',
  dataset: dataset ? '✅ Set' : '❌ Missing',
  token: token ? '✅ Set' : '❌ Missing',
  transport: useGateway ? 'API gateway (/api/sanity)' : 'direct',
  isDev,
  env: process.env.NODE_ENV
});

export const client = createClient({
  projectId,
  dataset,
  // Use CDN in production (faster, anonymous reads if dataset is public). In dev, hit API directly for latest content.
  useCdn: false, // Temporarily disabled for debugging
  // The gateway injects the token, so the web client must not send it.
  token: useGateway ? undefined : token,
  ...(useGateway ? { _requestHandler: gatewayRequestHandler } : {}),
  apiVersion: "2023-05-03",
  ignoreBrowserTokenWarning: true,
});
