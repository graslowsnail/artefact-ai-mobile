import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSession } from '../../lib/auth-client';
import type { MuseumArtwork } from '../../../shared/types/index';
import ArtworkCard from '../components/ArtworkCard';

interface VaultScreenProps {
  onBack: () => void;
  onArtworkPress: (artwork: MuseumArtwork) => void;
}

export default function VaultScreen({ onBack, onArtworkPress }: VaultScreenProps) {
  const { data: session } = useSession();
  const [vaultArtworks, setVaultArtworks] = useState<MuseumArtwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVaultArtworks();
  }, []);

  const loadVaultArtworks = async () => {
    if (!session?.user?.id) {
      Alert.alert('Error', 'Please sign in to view your vault');
      return;
    }

    setLoading(true);
    
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
      
    } catch (error) {
      console.error('Load vault error:', error);
      Alert.alert(
        'Error', 
        error instanceof Error ? error.message : 'Failed to load vault'
      );
    } finally {
      setLoading(false);
    }
  };

  // Function to remove artwork from vault (called when artwork is unfavorited)
  const removeArtworkFromVault = (artworkObjectId: number) => {
    setVaultArtworks(prev => prev.filter(item => item.object_id !== artworkObjectId));
  };

  const renderArtworkCard = ({ item }: { item: MuseumArtwork }) => (
    <ArtworkCard artwork={item} onPress={() => onArtworkPress(item)} />
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🔐 My Vault</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your vault...</Text>
        </View>
      ) : vaultArtworks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏛️</Text>
          <Text style={styles.emptyTitle}>Your Vault is Empty</Text>
          <Text style={styles.emptyText}>
            Start exploring artworks and add your favorites to build your personal collection!
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton} 
            onPress={onBack}
          >
            <Text style={styles.exploreButtonText}>🔍 Start Exploring</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.count}>
            {vaultArtworks.length} artwork{vaultArtworks.length !== 1 ? 's' : ''} in your vault
          </Text>
          
          <FlatList
            data={vaultArtworks}
            renderItem={renderArtworkCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.artworksList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  count: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginVertical: 16,
    textAlign: 'center',
  },
  artworksList: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
}); 