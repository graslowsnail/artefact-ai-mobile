import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { useSession } from '../../lib/auth-client';
import type { MuseumArtwork } from '../../../shared/types/index';
import { API_BASE_URL } from '../../config/api';

interface ArtworkDetailScreenProps {
  artwork: MuseumArtwork;
  onBack: () => void;
  onFavoriteChange?: (artwork: MuseumArtwork, isFavorited: boolean) => void;
}

export default function ArtworkDetailScreen({ artwork, onBack, onFavoriteChange }: ArtworkDetailScreenProps) {
  const { data: session } = useSession();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Check if artwork is favorited when screen loads
  useEffect(() => {
    checkFavoriteStatus();
  }, [artwork.object_id]);

  const checkFavoriteStatus = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/vault/check/${artwork.object_id}`, {
        headers: {
          'Authorization': `Bearer ${session.session.token}`,
          'x-user-id': session.user.id,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsFavorited(data.isFavorited);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'Please sign in to add artworks to your vault');
      return;
    }

    setLoadingFavorite(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/vault/toggle`, {
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
      setIsFavorited(data.isFavorited);

      // Notify parent component
      onFavoriteChange?.(artwork, data.isFavorited);

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

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.favoriteButton, 
            isFavorited && styles.favoriteButtonActive,
            loadingFavorite && styles.favoriteButtonLoading
          ]} 
          onPress={handleToggleFavorite}
          disabled={loadingFavorite}
        >
          <Text style={[
            styles.favoriteButtonText,
            isFavorited && styles.favoriteButtonActiveText
          ]}>
            {loadingFavorite ? '⏳ ' : (isFavorited ? '💖 ' : '🤍 ')}
            {isFavorited ? 'Remove from Vault' : 'Add to Vault'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Artwork Image */}
        <View style={styles.imageContainer}>
          {artwork.primary_image && !imageError ? (
            <Image 
              source={{ uri: artwork.primary_image }}
              style={styles.image}
              resizeMode="contain"
              onError={() => {
                setImageError(true);
              }}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>🖼️</Text>
              <Text style={styles.placeholderSubtext}>No image available</Text>
            </View>
          )}
        </View>

        {/* Artwork Information */}
        <View style={styles.info}>
          <Text style={styles.title}>{artwork.title}</Text>
          <Text style={styles.artist}>by {artwork.artist}</Text>
          
          <View style={styles.metadata}>
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  contentOverlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(180, 180, 180, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  backButtonText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  favoriteButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
    shadowColor: '#DC2626',
  },
  favoriteButtonLoading: {
    opacity: 0.6,
  },
  favoriteButtonText: {
    fontSize: 12,
    color: '#1C1C1E',
    fontWeight: '600',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  favoriteButtonActiveText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
  },
  placeholderText: {
    fontSize: 48,
    color: '#6C6C70',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#6C6C70',
    marginTop: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  info: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  artist: {
    fontSize: 20,
    color: '#6C6C70',
    fontStyle: 'italic',
    marginBottom: 24,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  metadata: {
    marginBottom: 24,
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metadataLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    width: 80,
    marginRight: 12,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  metadataValue: {
    fontSize: 16,
    color: '#6C6C70',
    flex: 1,
    flexWrap: 'wrap',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  museumButton: {
    backgroundColor: 'rgba(167, 139, 250, 1)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  museumButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
}); 