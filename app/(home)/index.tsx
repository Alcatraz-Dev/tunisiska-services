import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import { Link } from 'expo-router'
import { Text, View, ScrollView, TouchableOpacity, TextInput, Image, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function HomePage() {
  const { user } = useUser()

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <SignedIn>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View className="bg-white px-6 pb-6 pt-12 border-b border-gray-200">
            <View className="flex-row items-center justify-between mb-6">
              {/* User Info */}
              <Link href="/profile" className="flex-row items-center">
                <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mr-3">
                  {user?.imageUrl ? (
                    <Image 
                      source={{ uri: user.imageUrl }} 
                      className="w-12 h-12 rounded-full" 
                    />
                  ) : (
                    <Ionicons name="person" size={24} color="#6366F1" />
                  )}
                </View>
                <View>
                  <Text className="text-gray-500 text-sm">Welcome back</Text>
                  <Text className="text-dark font-semibold text-lg">
                    {user?.firstName} {user?.lastName}
                  </Text>
                </View>
              </Link>
              
              {/* Notification Icon */}
              <TouchableOpacity className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                <Ionicons name="notifications-outline" size={20} color="#4B5563" />
                <View className="w-2 h-2 bg-red-500 rounded-full absolute top-2 right-2" />
              </TouchableOpacity>
            </View>
            
            {/* Search Input */}
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 h-14">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <TextInput
                className="flex-1 h-full ml-3 text-dark"
                placeholder="Search anything..."
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Content Section */}
          <View className="px-6 mt-6">
            {/* Quick Stats */}
            <Text className="text-xl font-bold text-dark mb-4">Today's Overview</Text>
            
            <View className="flex-row justify-between mb-6">
              <View className="bg-white rounded-2xl p-5 shadow-sm w-[48%]">
                <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mb-3">
                  <Ionicons name="checkmark-done" size={24} color="#10B981" />
                </View>
                <Text className="text-2xl font-bold text-dark">12</Text>
                <Text className="text-gray-500 text-sm">Completed Tasks</Text>
              </View>
              
              <View className="bg-white rounded-2xl p-5 shadow-sm w-[48%]">
                <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mb-3">
                  <Ionicons name="time" size={24} color="#3B82F6" />
                </View>
                <Text className="text-2xl font-bold text-dark">5</Text>
                <Text className="text-gray-500 text-sm">Pending Tasks</Text>
              </View>
            </View>

            {/* Recent Activity */}
            <Text className="text-xl font-bold text-dark mb-4">Recent Activity</Text>
            
            <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="document-text" size={20} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-dark">Project Update</Text>
                  <Text className="text-gray-500 text-sm">Completed the dashboard design</Text>
                </View>
                <Text className="text-gray-400 text-xs">2h ago</Text>
              </View>
            </View>
            
            <View className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-yellow-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="chatbubble" size={20} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-dark">Team Meeting</Text>
                  <Text className="text-gray-500 text-sm">Scheduled for tomorrow</Text>
                </View>
                <Text className="text-gray-400 text-xs">4h ago</Text>
              </View>
            </View>
            
            <View className="bg-white rounded-2xl p-5 shadow-sm">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
                  <Ionicons name="alert-circle" size={20} color="#EF4444" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-dark">Deadline Approaching</Text>
                  <Text className="text-gray-500 text-sm">Project submission in 2 days</Text>
                </View>
                <Text className="text-gray-400 text-xs">1d ago</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SignedIn>
      
      <SignedOut>
        <View className="flex-1 justify-center items-center p-6">
          <View className="items-center max-w-xs">
            <Ionicons name="home-outline" size={80} color="#E5E7EB" />
            <Text className="text-2xl font-bold text-gray-700 mt-4 mb-2">Welcome</Text>
            <Text className="text-gray-500 text-center mb-8">
              Sign in to access your personalized dashboard
            </Text>
            
            <View className="w-full gap-3">
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity className="bg-primary rounded-xl p-4 items-center">
                  <Text className="text-white font-semibold">Sign In</Text>
                </TouchableOpacity>
              </Link>
              
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity className="border border-gray-300 bg-white rounded-xl p-4 items-center">
                  <Text className="text-primary font-semibold">Create Account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </SignedOut>
    </SafeAreaView>
  )
}