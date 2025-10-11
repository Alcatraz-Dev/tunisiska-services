import { client } from "@/sanityClient";


export interface UserData {
  clerkId: string;
  email: string;
}

export const getUserFromSanity = async (clerkId: string): Promise<{success: boolean, user?: any, error?: string}> => {
  try {
    console.log('🔍 Fetching user from Sanity:', clerkId);

    const user = await client.fetch(
      `*[_type == "users" && clerkId == $clerkId][0]`,
      { clerkId }
    );

    if (user) {
      console.log('✅ User found in Sanity');
      return { success: true, user };
    } else {
      console.log('❌ User not found in Sanity');
      return { success: false, error: 'User not found' };
    }
  } catch (error: any) {
    console.error('❌ Error fetching user from Sanity:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
};

export const createUserDirectInSanity = async (userData: UserData): Promise<{success: boolean, error?: string}> => {
  try {
    console.log('🔍 Checking if user exists in Sanity directly:', userData.clerkId);
    
    // Check if user already exists
    const existingUser = await client.fetch(
      `*[_type == "users" && clerkId == $clerkId][0]`,
      { clerkId: userData.clerkId }
    );

    if (existingUser) {
      console.log('✅ User already exists in Sanity');
      // Update existing user if email is different
      if (userData.email && existingUser.email !== userData.email) {
        console.log('🔄 Updating email for existing user');
        await client
          .patch(existingUser._id)
          .set({ email: userData.email })
          .commit();
      }
      return { success: true };
    } else {
      // Create new user
      console.log('➕ Creating new user directly in Sanity:', userData);
      const result = await client.create({
        _type: 'users',
        ...userData,
      });
      
      console.log('✅ User created successfully in Sanity directly');
      return { success: true };
    }
  } catch (error: any) {
    console.error('❌ Error creating user directly in Sanity:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    };
  }
};