import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gyroscope } from 'expo-sensors';
import { signIn, signUp, authClient } from '../lib/auth-client';

type AuthMode = 'signin' | 'signup';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [gyroscopeData, setGyroscopeData] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    // Subscribe to gyroscope updates
    const subscription = Gyroscope.addListener(gyroscopeData => {
      setGyroscopeData(gyroscopeData);
    });

    // Set update interval
    Gyroscope.setUpdateInterval(16); // ~60fps

    return () => subscription && subscription.remove();
  }, []);

  // Calculate parallax offset based on gyroscope data
  const parallaxX = gyroscopeData.y * 3; // Much less sensitive - need to tilt a lot
  const parallaxY = gyroscopeData.x * 3;

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      let result;
      
      if (mode === 'signup') {
        // Create new account
        result = await signUp.email({
          email,
          password,
          name: email.split('@')[0], // Use email username as name
        });
        
        if (result?.error) {
          throw new Error(result.error.message || 'Failed to create account');
        }
        
        Alert.alert('Success', 'Account created successfully!');
      } else {
        // Sign in existing user
        result = await signIn.email({
          email,
          password,
        });
        
        if (result?.error) {
          throw new Error(result.error.message || 'Invalid email or password');
        }
        
        Alert.alert('Success', 'Signed in successfully!');
      }

      // Clear form only on success
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Auth error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : (mode === 'signup' ? 'Failed to create account' : 'Failed to sign in');
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      
      const result = await signIn.social({
        provider: 'google',
        callbackURL: '/', // Will redirect to home after auth
      });
      
      if (result?.error) {
        throw new Error(result.error.message || 'Google sign in failed');
      }
      
    } catch (error) {
      console.error('Google auth error:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Google sign in failed';
        
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Moving Background Layer */}
      <ImageBackground
        source={require('../assets/images/vintage-scientific-bg-3.png')}
        style={[
          styles.backgroundImage,
          {
            transform: [
              { translateX: parallaxX },
              { translateY: parallaxY },
            ],
          },
        ]}
        resizeMode="cover"
      />
      
      {/* Fixed Content Layer */}
      <LinearGradient
        colors={['rgba(248, 249, 250, 0.25)', 'rgba(248, 249, 250, 0.15)']}
        style={styles.contentOverlay}
      >
        {/* Header at top */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Artefact AI</Text>
          <Text style={styles.subtitle}>Discover and collect amazing artwork</Text>
        </View>

        {/* Centered form content */}
        <View style={styles.content}>
          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, mode === 'signin' && styles.activeTab]}
              onPress={() => setMode('signin')}
            >
              <Text style={[styles.tabText, mode === 'signin' && styles.activeTabText]}>
                Sign In
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, mode === 'signup' && styles.activeTab]}
              onPress={() => setMode('signup')}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.activeTabText]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#8E8E93"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#8E8E93"
                secureTextEntry
                autoComplete="password"
              />
            </View>

            {/* Confirm Password (Sign Up only) */}
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  placeholderTextColor="#8E8E93"
                  secureTextEntry
                  autoComplete="password"
                />
              </View>
            )}

            {/* Email Auth Button */}
            <TouchableOpacity
              style={[styles.authButton, loading && styles.disabledButton]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.authButtonText}>
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Auth Button */}
            <TouchableOpacity
              style={[styles.googleButton, loading && styles.disabledButton]}
              onPress={handleGoogleAuth}
              disabled={loading}
            >
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    width: width + 40, // Slightly larger for parallax movement
    height: height + 40,
    marginLeft: -20,
    marginTop: -20,
  },
  contentOverlay: {
    flex: 1,
  },
  header: {
    paddingTop: 65,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#6C6C70',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '400',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(180, 180, 180, 0.5)',
    borderRadius: 14,
    padding: 6,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.4)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#1C1C1E',
  },
  form: {
    backgroundColor: 'rgba(180, 180, 180, 0.6)',
    padding: 28,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.5)',
  },
  inputContainer: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    color: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  authButton: {
    backgroundColor: 'rgba(167, 139, 250, 0.95)',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  disabledButton: {
    opacity: 0.6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(142, 142, 147, 0.4)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  googleButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
}); 