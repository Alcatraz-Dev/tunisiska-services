import { client } from "./sanityClient";
import { announcementQuery } from "./app/hooks/useQuery";

// Debug script to test Sanity connection and data fetching
export const debugSanity = async () => {
  console.log("🔍 Starting Sanity Debug...");
  
  // 1. Check environment variables
  console.log("📋 Environment Variables:");
  console.log("- PROJECT_ID:", process.env.EXPO_PUBLIC_SANITY_PROJECT_ID ? "✅ Set" : "❌ Missing");
  console.log("- DATASET:", process.env.EXPO_PUBLIC_SANITY_DATASET ? "✅ Set" : "❌ Missing");
  console.log("- TOKEN:", process.env.EXPO_PUBLIC_SANITY_TOKEN ? "✅ Set" : "❌ Missing");
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  console.log("- __DEV__:", __DEV__);
  
  // 2. Test basic connectivity
  console.log("\n🌐 Testing basic connectivity...");
  try {
    const basicQuery = `*[_type == "announcement"][0]`;
    console.log("Query:", basicQuery);
    const basicResult = await client.fetch(basicQuery);
    console.log("✅ Basic connectivity successful");
    console.log("Sample result:", JSON.stringify(basicResult, null, 2));
  } catch (error) {
    console.error("❌ Basic connectivity failed:");
    console.error("Error:", error.message);
    console.error("Status:", error.statusCode);
    console.error("Details:", error.details);
    return;
  }
  
  // 3. Test announcement query
  console.log("\n📢 Testing announcement query...");
  try {
    console.log("Query:", announcementQuery);
    const announcements = await client.fetch(announcementQuery);
    console.log("✅ Announcement query successful");
    console.log("Count:", announcements?.length || 0);
    console.log("First announcement:", JSON.stringify(announcements?.[0], null, 2));
  } catch (error) {
    console.error("❌ Announcement query failed:");
    console.error("Error:", error.message);
    console.error("Status:", error.statusCode);
    console.error("Details:", error.details);
  }
  
  // 4. Test dataset permissions
  console.log("\n🔐 Testing dataset permissions...");
  try {
    const permissionTest = `*[_type == "announcement"] | order(_createdAt desc)[0...1]`;
    const result = await client.fetch(permissionTest);
    console.log("✅ Dataset permissions OK");
    console.log("Result count:", result?.length || 0);
  } catch (error) {
    console.error("❌ Dataset permission issue:");
    console.error("Error:", error.message);
    if (error.statusCode === 401) {
      console.log("💡 Suggestion: Check if your dataset is public or if you need a valid token");
    }
  }
  
  // 5. Test client configuration
  console.log("\n⚙️ Client Configuration:");
  console.log("- Project ID:", client.config().projectId);
  console.log("- Dataset:", client.config().dataset);
  console.log("- API Version:", client.config().apiVersion);
  console.log("- Use CDN:", client.config().useCdn);
  console.log("- Has Token:", !!client.config().token);
  
  console.log("\n🏁 Debug complete!");
};