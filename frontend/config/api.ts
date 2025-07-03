import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getApiUrl = (): string => {
  // Check if we're in development mode
  if (__DEV__) {
    // For iOS simulator, use localhost
    if (Platform.OS === 'ios' && Constants.platform?.ios?.simulator) {
      return 'http://localhost:3000';
    }
    
    // For Android emulator, use 10.0.2.2 (Android emulator's special IP for host machine)
    if (Platform.OS === 'android' && !Constants.isDevice) {
      return 'http://10.0.2.2:3000';
    }
    
    // For physical devices, use the manifest debuggerHost IP
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (debuggerHost) {
      return `http://${debuggerHost}:3000`;
    }
    
    // Fallback to your current IP (you can update this when needed)
    return 'http://192.168.1.58:3000';
  }
  
  // Production URL (you'll set this when you deploy)
  return process.env.EXPO_PUBLIC_API_URL || 'https://your-production-api.com';
};

export const API_BASE_URL = getApiUrl();

console.log('🌐 API Base URL:', API_BASE_URL); 