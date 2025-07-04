import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  margin?: number;
}

export default function GlassCard({ 
  children, 
  style, 
  padding = 20, 
  margin = 16 
}: GlassCardProps) {
  return (
    <View style={[
      styles.glassCard,
      { padding, margin },
      style
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: 'rgba(180, 180, 180, 0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
}); 