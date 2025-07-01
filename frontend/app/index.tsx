import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { useSession, signOut } from '../lib/auth-client';
import AuthScreen from './auth';

export default function HomeScreen() {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully!');
    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  // Show auth screen if not signed in
  if (!session?.user) {
    return <AuthScreen />;
  }

  // Show main app if signed in
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎨 Artefact AI</Text>
        <Text style={styles.subtitle}>Welcome back, {session.user.name || session.user.email}!</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.userCard}>
          <Text style={styles.userCardTitle}>👤 User Profile</Text>
          <Text style={styles.userInfo}>
            <Text style={styles.label}>Email:</Text> {session.user.email}
          </Text>
          {session.user.name && (
            <Text style={styles.userInfo}>
              <Text style={styles.label}>Name:</Text> {session.user.name}
            </Text>
          )}
          <Text style={styles.userInfo}>
            <Text style={styles.label}>User ID:</Text> {session.user.id}
          </Text>
        </View>

        <View style={styles.artSection}>
          <Text style={styles.sectionTitle}>🖼️ Your Collection</Text>
          <Text style={styles.placeholder}>Your artwork collection will appear here!</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
      </TouchableOpacity>
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
    paddingBottom: 30,
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
  },
  content: {
    flex: 1,
    padding: 20,
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  label: {
    fontWeight: '600',
    color: '#333',
  },
  artSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  placeholder: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
