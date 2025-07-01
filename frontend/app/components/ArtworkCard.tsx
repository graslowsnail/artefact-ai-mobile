import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import type { MuseumArtwork } from '../../../shared/types/index';

interface ArtworkCardProps {
  artwork: MuseumArtwork;
  onPress: () => void;
}

export default function ArtworkCard({ artwork, onPress }: ArtworkCardProps) {
  return (
    <TouchableOpacity 
      style={styles.artworkCard} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {artwork.primary_image ? (
        <Image 
          source={{ uri: artwork.primary_image }} 
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
          {artwork.title}
        </Text>
        <Text style={styles.artworkArtist} numberOfLines={1}>
          {artwork.artist}
        </Text>
        <Text style={styles.artworkDate}>
          {artwork.date} • {artwork.department}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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