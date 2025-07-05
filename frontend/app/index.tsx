import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useSession, signOut } from '../lib/auth-client';
import AuthScreen from './auth';
import HomeScreen from './screens/HomeScreen';
import ArtworkDetailScreen from './screens/ArtworkDetailScreen';
import VaultScreen from './screens/VaultScreen';
import type { MuseumArtwork, SemanticArtwork } from '../../shared/types/index';

type Screen = 'home' | 'artwork-detail' | 'vault';

export default function AppNavigator() {
  const { data: session } = useSession();
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');
  const [selectedArtwork, setSelectedArtwork] = useState<MuseumArtwork | null>(null);

  // Lifted search state
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSearchResults, setAiSearchResults] = useState<SemanticArtwork[]>([]);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);
  const [aiHasSearched, setAiHasSearched] = useState(false);
  const [museumSearchResults, setMuseumSearchResults] = useState<MuseumArtwork[]>([]);
  const [museumSearchLoading, setMuseumSearchLoading] = useState(false);
  const [museumSearchError, setMuseumSearchError] = useState<string | null>(null);
  const [museumHasSearched, setMuseumHasSearched] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);

  // Navigation handlers
  const navigateToHome = () => {
    setPreviousScreen(currentScreen);
    setCurrentScreen('home');
    setSelectedArtwork(null);
  };

  const navigateToArtworkDetail = (artwork: MuseumArtwork) => {
    setPreviousScreen(currentScreen);
    setSelectedArtwork(artwork);
    setCurrentScreen('artwork-detail');
  };

  const navigateToVault = async () => {
    setPreviousScreen(currentScreen);
    setCurrentScreen('vault');
  };

  const navigateBack = () => {
    setSelectedArtwork(null);
    setCurrentScreen(previousScreen);
  };

  const handleSignOut = async () => {
    try {
      // Reset navigation state
      setCurrentScreen('home');
      setSelectedArtwork(null);
      
      // Reset search state on sign out
      setSearchQuery("");
      setAiSearchResults([]);
      setAiSearchLoading(false);
      setAiSearchError(null);
      setAiHasSearched(false);
      setMuseumSearchResults([]);
      setMuseumSearchLoading(false);
      setMuseumSearchError(null);
      setMuseumHasSearched(false);
      setUseSemanticSearch(true);
      
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
          onBack={navigateBack}
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
          // Pass search state and handlers
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          aiSearchResults={aiSearchResults}
          setAiSearchResults={setAiSearchResults}
          aiSearchLoading={aiSearchLoading}
          setAiSearchLoading={setAiSearchLoading}
          aiSearchError={aiSearchError}
          setAiSearchError={setAiSearchError}
          aiHasSearched={aiHasSearched}
          setAiHasSearched={setAiHasSearched}
          museumSearchResults={museumSearchResults}
          setMuseumSearchResults={setMuseumSearchResults}
          museumSearchLoading={museumSearchLoading}
          setMuseumSearchLoading={setMuseumSearchLoading}
          museumSearchError={museumSearchError}
          setMuseumSearchError={setMuseumSearchError}
          museumHasSearched={museumHasSearched}
          setMuseumHasSearched={setMuseumHasSearched}
          useSemanticSearch={useSemanticSearch}
          setUseSemanticSearch={setUseSemanticSearch}
        />
      );
  }
}
