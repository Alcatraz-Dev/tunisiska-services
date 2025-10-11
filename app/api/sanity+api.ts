// import { client } from '@/sanityClient';

// // CORS headers for Expo Go and web deployment
// const CORS_HEADERS = {
//   'Access-Control-Allow-Origin': '*',
//   'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//   'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
//   'Access-Control-Max-Age': '86400',
//   'Content-Type': 'application/json',
// };

// // Handle preflight OPTIONS requests
// export async function OPTIONS() {
//   return new Response(null, {
//     status: 200,
//     headers: CORS_HEADERS,
//   });
// }

// // Main GET handler for fetching Sanity data
// export async function GET(request: Request) {
//   try {
//     const url = new URL(request.url);
//     const query = url.searchParams.get('query');
//     const params = url.searchParams.get('params');
//     const type = url.searchParams.get('type');
    
//     // Parse parameters if provided
//     let parsedParams = {};
//     if (params) {
//       try {
//         parsedParams = JSON.parse(params);
//       } catch (error) {
//         console.error('❌ Error parsing params:', error);
//       }
//     }

//     let result;

//     // Handle different types of requests
//     switch (type) {
//       case 'users':
//         result = await fetchUsers(parsedParams);
//         break;
//       case 'user':
//         result = await fetchUserByClerkId(parsedParams);
//         break;
//       case 'all':
//         result = await fetchAllContent();
//         break;
//       case 'custom':
//         if (!query) {
//           throw new Error('Custom query requires a query parameter');
//         }
//         result = await client.fetch(query, parsedParams);
//         break;
//       default:
//         // If no specific type, try to use the query parameter
//         if (query) {
//           result = await client.fetch(query, parsedParams);
//         } else {
//           result = await fetchAllContent();
//         }
//     }

//     return new Response(JSON.stringify({
//       success: true,
//       data: result,
//       timestamp: new Date().toISOString()
//     }), {
//       status: 200,
//       headers: CORS_HEADERS,
//     });

//   } catch (error: any) {
//     console.error('❌ Sanity API Error:', error);
    
//     return new Response(JSON.stringify({
//       success: false,
//       error: error.message || 'Unknown error occurred',
//       timestamp: new Date().toISOString()
//     }), {
//       status: 500,
//       headers: CORS_HEADERS,
//     });
//   }
// }

// // POST handler for creating/updating data
// export async function POST(request: Request) {
//   try {
//     const body = await request.json();
//     const { action, data, documentId } = body;

//     let result;

//     switch (action) {
//       case 'create':
//         result = await client.create(data);
//         break;
//       case 'update':
//         if (!documentId) {
//           throw new Error('Document ID is required for updates');
//         }
//         result = await client.patch(documentId).set(data).commit();
//         break;
//       case 'createUser':
//         result = await createUser(data);
//         break;
//       // case 'sendNotification':
//       //   result = await sendNotification(documentId);
//       //   break;
//       // case 'cancelNotification':
//       //   result = await cancelNotification(documentId);
//       //   break;
//       // case 'getNotificationAnalytics':
//       //   result = await getNotificationAnalytics(documentId);
//       //   break;
//       // case 'updateNotificationAnalytics':
//       //   result = await updateNotificationAnalytics(documentId, data);
//         // break;
//       default:
//         throw new Error('Invalid action specified');
//     }

//     return new Response(JSON.stringify({
//       success: true,
//       data: result,
//       timestamp: new Date().toISOString()
//     }), {
//       status: 200,
//       headers: CORS_HEADERS,
//     });

//   } catch (error: any) {
//     console.error('❌ Sanity POST API Error:', error);
    
//     return new Response(JSON.stringify({
//       success: false,
//       error: error.message || 'Unknown error occurred',
//       timestamp: new Date().toISOString()
//     }), {
//       status: 500,
//       headers: CORS_HEADERS,
//     });
//   }
// }

// // Helper functions for common queries
// async function fetchUsers(params: any = {}) {
//   const query = `*[_type == "users"] | order(_createdAt desc)`;
//   return await client.fetch(query, params);
// }

// async function fetchUserByClerkId(params: { clerkId?: string } = {}) {
//   if (!params.clerkId) {
//     throw new Error('clerkId is required');
//   }
  
//   const query = `*[_type == "users" && clerkId == $clerkId][0]`;
//   return await client.fetch(query, params);
// }

// async function fetchAllContent() {
//   // Fetch all document types (customize based on your schema)
//   const queries = {
//     users: `*[_type == "users"] | order(_createdAt desc)`,
//     // Add more document types as needed
//     // posts: `*[_type == "post"] | order(_createdAt desc)`,
//     // pages: `*[_type == "page"] | order(_createdAt desc)`,
//   };

//   const results: any = {};
  
//   for (const [key, query] of Object.entries(queries)) {
//     try {
//       results[key] = await client.fetch(query);
//     } catch (error) {
//       console.error(`❌ Error fetching ${key}:`, error);
//       results[key] = [];
//     }
//   }

//   return results;
// }

// async function createUser(userData: any) {
//   // Check if user already exists
//   const existingUser = await client.fetch(
//     `*[_type == "users" && clerkId == $clerkId][0]`,
//     { clerkId: userData.clerkId }
//   );

//   if (existingUser) {
//     // Update existing user
//     return await client
//       .patch(existingUser._id)
//       .set(userData)
//       .commit();
//   } else {
//     // Create new user
//     return await client.create({
//       _type: 'users',
//       ...userData,
//     });
//   }
// }

// // Notification management functions
// // async function sendNotification(documentId: string) {
// //   // Import here to avoid circular dependencies
// //   const { sanityNotificationService } = await import('../services/sanityNotificationService');
  
// //   if (!documentId) {
// //     throw new Error('Document ID is required to send notification');
// //   }

// //   return await sanityNotificationService.processNotification(documentId);
// // }

// // async function cancelNotification(documentId: string) {
// //   const { sanityNotificationService } = await import('../services/sanityNotificationService');
  
// //   if (!documentId) {
// //     throw new Error('Document ID is required to cancel notification');
// //   }

// //   const success = await sanityNotificationService.cancelScheduledNotification(documentId);
// //   return { success, message: success ? 'Notification cancelled successfully' : 'Failed to cancel notification' };
// // }

// // async function getNotificationAnalytics(documentId?: string) {
// //   const { sanityNotificationService } = await import('../services/sanityNotificationService');
  
// //   return await sanityNotificationService.getNotificationAnalytics(documentId);
// // }

// // async function updateNotificationAnalytics(documentId: string, analyticsData: any) {
// //   const { sanityNotificationService } = await import('../services/sanityNotificationService');
  
// //   if (!documentId) {
// //     throw new Error('Document ID is required to update analytics');
// //   }

// //   await sanityNotificationService.updateNotificationAnalytics(documentId, analyticsData);
// //   return { success: true, message: 'Analytics updated successfully' };
// // }
