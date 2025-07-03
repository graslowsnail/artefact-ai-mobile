import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useSession } from '../../lib/auth-client';
import type { MuseumArtwork, ArtworkSearchResponse, SemanticSearchResponse, SemanticArtwork } from '../../../shared/types/index';
import ArtworkCard from '../components/ArtworkCard';
import { API_BASE_URL } from '../../config/api';

interface HomeScreenProps {
  onArtworkPress: (artwork: MuseumArtwork) => void;
  onVaultPress: () => void;
  onSignOut: () => void;
}

export default function HomeScreen({ onArtworkPress, onVaultPress, onSignOut }: HomeScreenProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [artworks, setArtworks] = useState<(MuseumArtwork | SemanticArtwork)[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loadingVault, setLoadingVault] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true); // Default to semantic search
  const [aiResponse, setAiResponse] = useState<string>('');

  // Reset search state when user changes
  useEffect(() => {
    if (session?.user?.id !== currentUserId) {
      console.log('🔄 User changed, resetting search state');
      setSearchQuery('');
      setArtworks([]);
      setLoading(false);
      setHasSearched(false);
      setCurrentUserId(session?.user?.id || null);
      setAiResponse('');
    }
  }, [session?.user?.id, currentUserId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    try {
      setLoading(true);
      setHasSearched(true);
      
      const endpoint = useSemanticSearch ? '/semantic-search' : '/search';
      const response = await fetch(`${API_BASE_URL}/api/artwork${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery, limit: 20 }),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Search failed');
        } catch {
          throw new Error(`Search failed with status ${response.status}`);
        }
      }

      if (useSemanticSearch) {
        const data: SemanticSearchResponse = await response.json();
        console.log('🔍 Semantic search results:', {
          total: data.total,
          artworksCount: data.artworks.length,
          query: data.query,
          aiResponse: data.aiResponse.substring(0, 100) + '...'
        });
        setArtworks(data.artworks);
        setAiResponse(data.aiResponse);
        
        if (data.artworks.length === 0) {
          Alert.alert('No Results', 'No artworks found for your search. Try different keywords!');
        }
      } else {
        const data: ArtworkSearchResponse = await response.json();
        console.log('🌐 Met Museum search results:', {
          total: data.total,
          artworksCount: data.artworks.length,
          aiResponse: data.aiResponse.substring(0, 100) + '...'
        });
        setArtworks(data.artworks);
        setAiResponse(data.aiResponse);
        
        if (data.artworks.length === 0) {
          Alert.alert('No Results', 'No artworks found for your search. Try different keywords!');
        }
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
      } else if (errorMessage.includes('Embedding service temporarily unavailable')) {
        Alert.alert(
          'AI Search Unavailable', 
          'The AI semantic search is temporarily unavailable. Try switching to regular search.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Search Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVaultPress = async () => {
    setLoadingVault(true);
    try {
      await onVaultPress();
    } finally {
      setLoadingVault(false);
    }
  };

  const renderArtworkCard = ({ item }: { item: MuseumArtwork | SemanticArtwork }) => (
    <ArtworkCard 
      artwork={item} 
      onPress={() => onArtworkPress(item)} 
      similarity={useSemanticSearch ? (item as SemanticArtwork).similarity : undefined}
    />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎨 Artefact AI</Text>
        <Text style={styles.subtitle}>
          {useSemanticSearch ? 'AI-powered semantic art discovery' : 'Discover amazing artwork with natural language'}
        </Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.vaultButton} 
            onPress={handleVaultPress}
            disabled={loadingVault}
          >
            <Text style={styles.vaultButtonText}>
              {loadingVault ? '⏳' : '🔐'} My Vault
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
            <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Search Mode Toggle */}
        <View style={styles.searchModeSection}>
          <Text style={styles.searchModeTitle}>Search Mode:</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleButton, useSemanticSearch && styles.toggleButtonActive]}
              onPress={() => setUseSemanticSearch(true)}
            >
              <Text style={[styles.toggleText, useSemanticSearch && styles.toggleTextActive]}>
                🧠 AI Semantic
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, !useSemanticSearch && styles.toggleButtonActive]}
              onPress={() => setUseSemanticSearch(false)}
            >
              <Text style={[styles.toggleText, !useSemanticSearch && styles.toggleTextActive]}>
                🌐 Met Museum
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.searchTitle}>🔍 Search Artworks</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={useSemanticSearch 
                ? "e.g. 'Japanese landscapes', 'golden ancient jewelry', 'melancholy portraits'"
                : "e.g. 'cool mexican art', 'van gogh sunflowers'"
              }
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
                <Text style={styles.searchButtonText}>
                  {useSemanticSearch ? '🧠 AI Search' : '🔍 Search'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Response Section */}
        {aiResponse && !loading && (
          <View style={styles.aiResponseSection}>
            <Text style={styles.aiResponseTitle}>🎭 Curator's Insight:</Text>
            <Text style={styles.aiResponseText}>{aiResponse}</Text>
          </View>
        )}

        {/* Results Section */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {useSemanticSearch 
                ? 'Using AI to find semantically similar artworks...' 
                : 'Searching for amazing artworks...'
              }
            </Text>
          </View>
        )}
        
        {!loading && hasSearched && artworks.length === 0 && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>🎨 No artworks found</Text>
            <Text style={styles.noResultsSubtext}>Try different search terms</Text>
          </View>
        )}
        
        {!loading && artworks.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              Found {artworks.length} artworks
              {useSemanticSearch && ' (sorted by similarity)'}
            </Text>
            <FlatList
              data={artworks}
              renderItem={renderArtworkCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.artworksList}
              scrollEnabled={false}
              nestedScrollEnabled={true}
            />
          </View>
        )}
        
        {!hasSearched && (
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeText}>👋 Welcome back, {session?.user.name || 'Art Lover'}!</Text>
            <Text style={styles.welcomeSubtext}>
              {useSemanticSearch 
                ? 'Search for artworks using AI semantic understanding.\nTry: "serene landscapes", "ancient gold artifacts", or "vibrant impressionist paintings"'
                : 'Search for artworks using natural language.\nTry: "impressionist paintings", "ancient egyptian art", or "van gogh"'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  searchModeSection: {
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
  searchModeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
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
  aiResponseSection: {
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
  aiResponseTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  aiResponseText: {
    fontSize: 16,
    color: '#666',
  },
  resultsSection: {
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
}); 