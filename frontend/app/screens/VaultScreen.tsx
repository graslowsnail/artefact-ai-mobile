import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  ImageBackground,
  Dimensions,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '../../lib/auth-client';
import type { MuseumArtwork } from '../../../shared/types/index';
import ArtworkCard from '../components/ArtworkCard';
import GlassCard from '../components/GlassCard';
import { API_BASE_URL } from '../../config/api';

const { width, height } = Dimensions.get('window');

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
      const response = await fetch(`${API_BASE_URL}/api/vault/my-vault`, {
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
      {/* Vintage Scientific Background */}
      <ImageBackground
        source={require('../../assets/images/vintage-scientific-bg-3.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Content Overlay */}
      <LinearGradient
        colors={[
          'rgba(248, 249, 250, 0.25)',
          'rgba(248, 249, 250, 0.15)',
        ]}
        style={styles.contentOverlay}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            
            <Text style={styles.title}>🔐 My Vault</Text>
            
            <View style={styles.backButton} />
          </View>
          
          <Text style={styles.subtitle}>
            Your personal collection of amazing artworks
          </Text>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <GlassCard style={styles.centeredContainer}>
              <ActivityIndicator size="large" color="#a78bfa" />
              <Text style={styles.loadingText}>Loading your vault...</Text>
            </GlassCard>
          ) : vaultArtworks.length === 0 ? (
            <GlassCard style={styles.centeredContainer}>
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
            </GlassCard>
          ) : (
            <GlassCard>
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
                scrollEnabled={false}
                nestedScrollEnabled={true}
              />
            </GlassCard>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height,
  },
  contentOverlay: {
    flex: 1,
  },
  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(180, 180, 180, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#6C6C70',
    textAlign: 'center',
    fontWeight: '400',
    marginTop: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
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
    minWidth: 60,
  },
  backButtonText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    textAlign: 'center',
    flex: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  centeredContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#6C6C70',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(255, 255, 255, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  exploreButton: {
    backgroundColor: 'rgba(167, 139, 250, 1)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  count: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  artworksList: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
  },
}); 