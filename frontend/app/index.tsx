import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useSession, signOut } from '../lib/auth-client';
import AuthScreen from './auth';
import HomeScreen from './screens/HomeScreen';
import ArtworkDetailScreen from './screens/ArtworkDetailScreen';
import VaultScreen from './screens/VaultScreen';
import type { MuseumArtwork } from '../../shared/types/index';

type Screen = 'home' | 'artwork-detail' | 'vault';

export default function AppNavigator() {
  const { data: session } = useSession();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedArtwork, setSelectedArtwork] = useState<MuseumArtwork | null>(null);

  // Navigation handlers
  const navigateToHome = () => {
    setCurrentScreen('home');
    setSelectedArtwork(null);
  };

  const navigateToArtworkDetail = (artwork: MuseumArtwork) => {
    setSelectedArtwork(artwork);
    setCurrentScreen('artwork-detail');
  };

  const navigateToVault = async () => {
    setCurrentScreen('vault');
  };

  const handleSignOut = async () => {
    try {
      // Reset navigation state
      setCurrentScreen('home');
      setSelectedArtwork(null);
      
      await signOut();
      Alert.alert('Success', 'Signed out successfully!');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleFavoriteChange = (artwork: MuseumArtwork, isFavorited: boolean) => {
    // This can be used to update UI state across screens if needed
    console.log(`Artwork ${artwork.object_id} ${isFavorited ? 'added to' : 'removed from'} vault`);
  };

  // Show auth screen if not signed in
  if (!session?.user) {
    return <AuthScreen />;
  }

  // Render appropriate screen
  switch (currentScreen) {
    case 'vault':
      return (
        <VaultScreen 
          onBack={navigateToHome}
          onArtworkPress={navigateToArtworkDetail}
        />
      );

    case 'artwork-detail':
      if (!selectedArtwork) {
        // Fallback to home if no artwork selected
        setCurrentScreen('home');
        return null;
      }
      return (
        <ArtworkDetailScreen 
          artwork={selectedArtwork}
          onBack={navigateToHome}
          onFavoriteChange={handleFavoriteChange}
        />
      );

    case 'home':
    default:
      return (
        <HomeScreen 
          onArtworkPress={navigateToArtworkDetail}
          onVaultPress={navigateToVault}
          onSignOut={handleSignOut}
        />
      );
  }
}
