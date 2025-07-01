import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, TextInput, FlatList, ActivityIndicator, Image, ScrollView, Linking } from 'react-native';
import { useSession, signOut } from '../lib/auth-client';
import AuthScreen from './auth';
import type { MuseumArtwork, ArtworkSearchResponse } from '../../shared/types/index';

export default function HomeScreen() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [artworks, setArtworks] = useState<MuseumArtwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<MuseumArtwork | null>(null);
  const [favoriteStatus, setFavoriteStatus] = useState<{[key: number]: boolean}>({});
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [vaultArtworks, setVaultArtworks] = useState<MuseumArtwork[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);

  // Reset search state when user changes
  useEffect(() => {
    if (session?.user?.id !== currentUserId) {
      // User has changed, reset all search state
      console.log('🔄 User changed, resetting search state');
      setSearchQuery('');
      setArtworks([]);
      setLoading(false);
      setHasSearched(false);
      setSelectedArtwork(null);
      setFavoriteStatus({});
      setLoadingFavorite(false);
      setShowVault(false);
      setVaultArtworks([]);
      setLoadingVault(false);
      setCurrentUserId(session?.user?.id || null);
    }
  }, [session?.user?.id, currentUserId]);

  const handleSignOut = async () => {
    try {
      // Clear search state before signing out
      setSearchQuery('');
      setArtworks([]);
      setLoading(false);
      setHasSearched(false);
      setSelectedArtwork(null);
      setFavoriteStatus({});
      setLoadingFavorite(false);
      setShowVault(false);
      setVaultArtworks([]);
      setLoadingVault(false);
      
      await signOut();
      Alert.alert('Success', 'Signed out successfully!');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      
      const response = await fetch('http://localhost:3000/api/artwork/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery }),
      });

      if (!response.ok) {
        // Try to get error details from the response
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Search failed');
        } catch {
          throw new Error(`Search failed with status ${response.status}`);
        }
      }

      const data: ArtworkSearchResponse = await response.json();
      setArtworks(data.artworks);
      
      if (data.artworks.length === 0) {
        Alert.alert('No Results', 'No artworks found for your search. Try different keywords!');
      }
    } catch (error) {
      console.error('Search error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to search artworks. Please try again.';
      
      if (errorMessage.includes('Museum API temporarily unavailable')) {
        Alert.alert(
          'Museum API Issues', 
          'The Met Museum API is having temporary issues. Please try again in a few moments.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Search Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleArtworkPress = async (artwork: MuseumArtwork) => {
    setSelectedArtwork(artwork);
    
    // Check if this artwork is favorited
    if (session?.user?.id && favoriteStatus[artwork.object_id] === undefined) {
      try {
        const response = await fetch(`http://localhost:3000/api/vault/check/${artwork.object_id}`, {
          headers: {
            'Authorization': `Bearer ${session.session.token}`,
            'x-user-id': session.user.id,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setFavoriteStatus(prev => ({
            ...prev,
            [artwork.object_id]: data.isFavorited
          }));
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    }
  };

  const handleBackToList = () => {
    setSelectedArtwork(null);
  };

  const handleOpenVault = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'Please sign in to view your vault');
      return;
    }

    setLoadingVault(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/vault/my-vault', {
        headers: {
          'Authorization': `Bearer ${session.session.token}`,
          'x-user-id': session.user.id,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load vault');
      }

      const data = await response.json();
      setVaultArtworks(data.vault);
      setShowVault(true);
      
    } catch (error) {
      console.error('Load vault error:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to load vault'
      );
    } finally {
      setLoadingVault(false);
    }
  };

  const handleBackFromVault = () => {
    setShowVault(false);
  };

  const handleToggleFavorite = async (artwork: MuseumArtwork) => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'Please sign in to add artworks to your vault');
      return;
    }

    setLoadingFavorite(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/vault/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.token}`,
          'x-user-id': session.user.id,
        },
        body: JSON.stringify({ objectId: artwork.object_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle favorite');
      }

      const data = await response.json();
      
      // Update local state
      setFavoriteStatus(prev => ({
        ...prev,
        [artwork.object_id]: data.isFavorited
      }));

      // If vault is currently shown and item was removed, refresh the vault
      if (showVault && !data.isFavorited) {
        setVaultArtworks(prev => prev.filter(item => item.object_id !== artwork.object_id));
      }

      // Show success message
      Alert.alert(
        'Vault Updated',
        data.message,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Toggle favorite error:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to update vault'
      );
    } finally {
      setLoadingFavorite(false);
    }
  };

  const handleOpenMuseumLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open museum link');
    }
  };

  const renderArtworkCard = ({ item }: { item: MuseumArtwork }) => (
    <TouchableOpacity 
      style={styles.artworkCard} 
      onPress={() => handleArtworkPress(item)}
      activeOpacity={0.7}
    >
      {item.primary_image ? (
        <Image 
          source={{ uri: item.primary_image }} 
          style={styles.artworkImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>🖼️</Text>
        </View>
      )}
      
      <View style={styles.artworkInfo}>
        <Text style={styles.artworkTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.artworkArtist} numberOfLines={1}>
          {item.artist}
        </Text>
        <Text style={styles.artworkDate}>
          {item.date} • {item.department}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderArtworkDetail = (artwork: MuseumArtwork) => (
    <View style={styles.detailContainer}>
      {/* Header with back button */}
      <View style={styles.detailHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToList}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.favoriteButton, 
            favoriteStatus[artwork.object_id] && styles.favoriteButtonActive,
            loadingFavorite && styles.favoriteButtonLoading
          ]} 
          onPress={() => handleToggleFavorite(artwork)}
          disabled={loadingFavorite}
        >
          <Text style={[
            styles.favoriteButtonText,
            favoriteStatus[artwork.object_id] && styles.favoriteButtonActiveText
          ]}>
            {loadingFavorite ? '⏳ ' : (favoriteStatus[artwork.object_id] ? '💖 ' : '🤍 ')}
            {favoriteStatus[artwork.object_id] ? 'Remove from Vault' : 'Add to Vault'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

      {/* Artwork Image */}
      <View style={styles.detailImageContainer}>
        {artwork.primary_image ? (
          <Image 
            source={{ uri: artwork.primary_image }} 
            style={styles.detailImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.detailPlaceholder}>
            <Text style={styles.detailPlaceholderText}>🖼️</Text>
            <Text style={styles.detailPlaceholderSubtext}>No image available</Text>
          </View>
        )}
      </View>

      {/* Artwork Information */}
      <View style={styles.detailInfo}>
        <Text style={styles.detailTitle}>{artwork.title}</Text>
        <Text style={styles.detailArtist}>by {artwork.artist}</Text>
        
        <View style={styles.detailMetadata}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Date:</Text>
            <Text style={styles.metadataValue}>{artwork.date}</Text>
          </View>
          
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Medium:</Text>
            <Text style={styles.metadataValue}>{artwork.medium}</Text>
          </View>
          
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Department:</Text>
            <Text style={styles.metadataValue}>{artwork.department}</Text>
          </View>
          
          {artwork.culture && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Culture:</Text>
              <Text style={styles.metadataValue}>{artwork.culture}</Text>
            </View>
          )}
          
          {artwork.credit_line && (
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Credit:</Text>
              <Text style={styles.metadataValue}>{artwork.credit_line}</Text>
            </View>
          )}
        </View>

        {/* View at Museum Button */}
        {artwork.object_url && (
          <TouchableOpacity 
            style={styles.museumButton}
            onPress={() => handleOpenMuseumLink(artwork.object_url!)}
          >
            <Text style={styles.museumButtonText}>🏛️ View at Met Museum</Text>
          </TouchableOpacity>
        )}
      </View>
      </ScrollView>
    </View>
  );

  const renderVaultScreen = () => (
    <View style={styles.container}>
      {/* Vault Header */}
      <View style={styles.vaultHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackFromVault}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.vaultTitle}>🔐 My Vault</Text>
        <View style={styles.backButton} />
      </View>

      {loadingVault ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your vault...</Text>
        </View>
      ) : vaultArtworks.length === 0 ? (
        <View style={styles.emptyVaultContainer}>
          <Text style={styles.emptyVaultIcon}>🏛️</Text>
          <Text style={styles.emptyVaultTitle}>Your Vault is Empty</Text>
          <Text style={styles.emptyVaultText}>
            Start exploring artworks and add your favorites to build your personal collection!
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton} 
            onPress={handleBackFromVault}
          >
            <Text style={styles.exploreButtonText}>🔍 Start Exploring</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.vaultContent}>
          <Text style={styles.vaultCount}>
            {vaultArtworks.length} artwork{vaultArtworks.length !== 1 ? 's' : ''} in your vault
          </Text>
          
          <FlatList
            data={vaultArtworks}
            renderItem={renderArtworkCard}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.artworksList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );

  // Show auth screen if not signed in
  if (!session?.user) {
    return <AuthScreen />;
  }

  // Show vault screen if vault is open
  if (showVault) {
    return renderVaultScreen();
  }

  // Show artwork detail if one is selected
  if (selectedArtwork) {
    return (
      <View style={styles.container}>
        {renderArtworkDetail(selectedArtwork)}
      </View>
    );
  }

  // Show main app if signed in
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎨 Artefact AI</Text>
        <Text style={styles.subtitle}>Discover amazing artwork with natural language</Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.vaultButton} 
            onPress={handleOpenVault}
            disabled={loadingVault}
          >
            <Text style={styles.vaultButtonText}>
              {loadingVault ? '⏳' : '🔐'} My Vault
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchSection}>
        <Text style={styles.searchTitle}>🔍 Search Artworks</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="e.g. 'cool mexican art', 'van gogh sunflowers'"
            placeholderTextColor="#999"
            editable={!loading}
          />
          <TouchableOpacity 
            style={[styles.searchButton, loading && styles.searchButtonDisabled]} 
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.resultsContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Searching for amazing artworks...</Text>
          </View>
        )}
        
        {!loading && hasSearched && artworks.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>🎨 No artworks found</Text>
            <Text style={styles.noResultsSubtext}>Try different search terms</Text>
          </View>
        )}
        
        {!loading && artworks.length > 0 && (
          <>
            <Text style={styles.resultsTitle}>
              Found {artworks.length} artworks
            </Text>
            <FlatList
              data={artworks}
              renderItem={renderArtworkCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.artworksList}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
        
        {!hasSearched && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>👋 Welcome back, {session.user.name || 'Art Lover'}!</Text>
            <Text style={styles.welcomeSubtext}>
              Search for artworks using natural language.{'\n'}
              Try: "impressionist paintings", "ancient egyptian art", or "van gogh"
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e6f2ff',
    textAlign: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  vaultButton: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  vaultButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginVertical: 16,
  },
  artworksList: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
  artworkCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '48%',
  },
  artworkImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 32,
    color: '#ccc',
  },
  artworkInfo: {
    padding: 12,
  },
  artworkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  artworkArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  artworkDate: {
    fontSize: 12,
    color: '#999',
  },
  
  // Detail view styles
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  favoriteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffeaa7',
    borderRadius: 8,
  },
  favoriteButtonActive: {
    backgroundColor: '#ff6b6b',
  },
  favoriteButtonLoading: {
    opacity: 0.6,
  },
  favoriteButtonText: {
    fontSize: 14,
    color: '#e17055',
    fontWeight: '500',
  },
  favoriteButtonActiveText: {
    color: '#fff',
  },
  detailImageContainer: {
    height: 300,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  detailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  detailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailPlaceholderText: {
    fontSize: 48,
    color: '#adb5bd',
  },
  detailPlaceholderSubtext: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
  },
  detailInfo: {
    flex: 1,
    padding: 16,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  detailArtist: {
    fontSize: 18,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  detailMetadata: {
    marginBottom: 24,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    width: 80,
    marginRight: 12,
  },
  metadataValue: {
    fontSize: 16,
    color: '#212529',
    flex: 1,
    flexWrap: 'wrap',
  },
  museumButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  museumButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Vault styles
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  vaultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  vaultContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  vaultCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginVertical: 16,
    textAlign: 'center',
  },
  emptyVaultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyVaultIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyVaultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyVaultText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
