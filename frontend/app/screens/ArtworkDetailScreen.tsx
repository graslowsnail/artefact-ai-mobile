import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { useSession } from '../../lib/auth-client';
import type { MuseumArtwork } from '../../../shared/types/index';

interface ArtworkDetailScreenProps {
  artwork: MuseumArtwork;
  onBack: () => void;
  onFavoriteChange?: (artwork: MuseumArtwork, isFavorited: boolean) => void;
}

export default function ArtworkDetailScreen({ artwork, onBack, onFavoriteChange }: ArtworkDetailScreenProps) {
  const { data: session } = useSession();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loadingFavorite, setLoadingFavorite] = useState(false);

  // Check if artwork is favorited when screen loads
  useEffect(() => {
    checkFavoriteStatus();
  }, [artwork.object_id]);

  const checkFavoriteStatus = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`http://localhost:3000/api/vault/check/${artwork.object_id}`, {
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
          {artwork.primary_image ? (
            <Image 
              source={{ uri: artwork.primary_image }} 
              style={styles.image}
              resizeMode="contain"
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: 60,
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
  imageContainer: {
    height: 300,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 48,
    color: '#adb5bd',
  },
  placeholderSubtext: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
  },
  info: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  artist: {
    fontSize: 18,
    color: '#6c757d',
    fontStyle: 'italic',
    marginBottom: 24,
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
}); 