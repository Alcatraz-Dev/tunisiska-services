import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const LoadingSpinner: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" color={isDark ? '#0ea5e9' : '#0369a1'} />
      <Text className={`mt-4 ${isDark ? 'text-dark-text' : 'text-light-text'}`}>
        Loading...
      </Text>
    </View>
  );
};