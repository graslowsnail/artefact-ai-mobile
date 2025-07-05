import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import type { MuseumArtwork, SemanticArtwork } from '../../../shared/types/index';

interface ArtworkCardProps {
  artwork: MuseumArtwork | SemanticArtwork;
  onPress: () => void;
  similarity?: number; // Optional similarity score for semantic search
}

export default function ArtworkCard({ artwork, onPress, similarity }: ArtworkCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <TouchableOpacity 
      style={styles.artworkCard} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      {artwork.primary_image && !imageError ? (
        <Image 
          source={{ uri: artwork.primary_image }}
          style={styles.artworkImage}
          resizeMode="cover"
          onError={() => {
            setImageError(true);
          }}
        />
      ) : (
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>🖼️</Text>
        </View>
      )}
      
      {/* Similarity Badge for Semantic Search */}
      {similarity !== undefined && (
        <View style={styles.similarityBadge}>
          <Text style={styles.similarityText}>
            {Math.round(similarity * 100)}% match
          </Text>
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
    position: 'relative',
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
  similarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(167, 139, 250, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  similarityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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