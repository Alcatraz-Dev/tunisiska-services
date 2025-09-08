import { useSignIn } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { GoogleSignInButton } from '@/app/components/GoogleSignInButton'

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)

  const onSignInPress = async () => {
    if (!isLoaded) return
    
    setIsLoading(true)
    setError('')
    
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId })
        router.replace('/')
      } else {
        setError('Sign in process requires additional steps.')
        console.error(JSON.stringify(signInAttempt, null, 2))
      }
    } catch (err) {
      setError('Invalid email or password. Please try again.')
      console.error(JSON.stringify(err, null, 2))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View className="flex-1 bg-light p-6 justify-center">
      <View className="items-center mb-12">
        <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
          <Ionicons name="lock-closed" size={32} color="#6366F1" />
        </View>
        <Text className="text-3xl font-bold text-dark mb-2">Welcome Back</Text>
        <Text className="text-muted">Sign in to continue</Text>
      </View>

      {error ? (
        <View className="flex-row items-center bg-danger/10 border border-danger/20 rounded-xl p-4 mb-6">
          <Ionicons name="alert-circle" size={20} color="#EF4444" />
          <Text className="text-danger ml-2 text-sm">{error}</Text>
        </View>
      ) : null}

      <View className="mb-8">
        {/* Google Sign In Button */}
        <GoogleSignInButton />
        
        {/* Divider */}
        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="text-muted mx-4 text-sm">Or continue with email</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>
        
        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 h-14 mb-4">
          <Ionicons name="mail-outline" size={20} color="#64748B" />
          <TextInput
            className="flex-1 h-full ml-3 text-dark"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={emailAddress}
            placeholder="Email address"
            placeholderTextColor="#94A3B8"
            onChangeText={setEmailAddress}
          />
        </View>

        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4 h-14">
          <Ionicons name="key-outline" size={20} color="#64748B" />
          <TextInput
            className="flex-1 h-full ml-3 text-dark"
            value={password}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!passwordVisible}
            onChangeText={setPassword}
          />
          <TouchableOpacity 
            onPress={() => setPasswordVisible(!passwordVisible)}
          >
            <Ionicons 
              name={passwordVisible ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#64748B" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        className={`flex-row items-center justify-center bg-primary rounded-xl h-14 mb-4 ${(!emailAddress || !password) && 'opacity-60'}`}
        onPress={onSignInPress}
        disabled={!emailAddress || !password || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text className="text-white font-semibold text-base mr-2">Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center items-center mt-8">
        <Text className="text-muted">Don't have an account?</Text>
        <Link href="/sign-up" className="ml-1">
          <Text className="text-primary font-semibold">Sign up</Text>
        </Link>
      </View>
    </View>
  )
}