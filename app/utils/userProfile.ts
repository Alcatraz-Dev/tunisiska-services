import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfileData {
  membershipTier: string;
  shipmentsCompleted: number;
  ongoingShipments: number;
  points: number;
  defaultLanguage: string;
  country: string;
  referralCode: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  signUpMethod: 'google' | 'email';
  googleProfile?: {
    givenName?: string;
    familyName?: string;
    picture?: string;
    locale?: string;
  };
    isDriver?: boolean;
}

export const getUserProfile = async (userId: string): Promise<UserProfileData | null> => {
  try {
    const profile = await AsyncStorage.getItem(`userProfile_${userId}`);
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (userId: string, updates: Partial<UserProfileData>): Promise<boolean> => {
  try {
    const currentProfile = await getUserProfile(userId);
    if (currentProfile) {
      const updatedProfile = { ...currentProfile, ...updates };
      await AsyncStorage.setItem(`userProfile_${userId}`, JSON.stringify(updatedProfile));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

export const createUserProfile = async (
  userId: string, 
  email: string, 
  firstName?: string, 
  lastName?: string,
  signUpMethod: 'google' | 'email' = 'email'
): Promise<boolean> => {
  try {
    const profileData: UserProfileData = {
      membershipTier: signUpMethod === 'google' ? "Standardmedlem" : "Ny medlem",
      shipmentsCompleted: 0,
      ongoingShipments: 0,
      points: signUpMethod === 'google' ? 100 : 50, // Bonus for Google signup
      defaultLanguage: "Svenska",
      country: "Sverige",
      referralCode: `SHIP${Math.floor(1000 + Math.random() * 9000)}`,
      signUpMethod,
      ...(signUpMethod === 'google' ? {
        googleProfile: {
          givenName: firstName,
          familyName: lastName,
          locale: "sv-SE"
        }
      } : {})
    };

    await AsyncStorage.setItem(`userProfile_${userId}`, JSON.stringify(profileData));
    await AsyncStorage.setItem(`userEmail_${userId}`, email);
    
    return true;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return false;
  }
};