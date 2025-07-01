import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, TextInput, FlatList, ActivityIndicator, Image } from 'react-native';
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

  // Reset search state when user changes
  useEffect(() => {
    if (session?.user?.id !== currentUserId) {
      // User has changed, reset all search state
      console.log('🔄 User changed, resetting search state');
      setSearchQuery('');
      setArtworks([]);
      setLoading(false);
      setHasSearched(false);
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

  const renderArtworkCard = ({ item }: { item: MuseumArtwork }) => (
    <View style={styles.artworkCard}>
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
    </View>
  );

  // Show auth screen if not signed in
  if (!session?.user) {
    return <AuthScreen />;
  }

  // Show main app if signed in
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎨 Artefact AI</Text>
        <Text style={styles.subtitle}>Discover amazing artwork with natural language</Text>
        
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
        </TouchableOpacity>
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
});
