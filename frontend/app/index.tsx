import { StyleSheet, Text, View, FlatList, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface ApiResponse {
  message: string;
  timestamp: string;
  requestId: number;
  data: {
    users: User[];
    totalUsers: number;
    serverInfo: {
      nodeVersion: string;
      platform: string;
      arch: string;
    };
  };
}

export default function Index() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTestData();
  }, []);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/test');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      console.error('API call failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.errorHint}>Make sure your backend is running on localhost:3000</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚀 Artefact AI</Text>
      <Text style={styles.message}>{data?.message}</Text>
      
      <Text style={styles.sectionTitle}>Users ({data?.data.totalUsers})</Text>
      
      <FlatList
        data={data?.data.users}
        renderItem={renderUser}
        keyExtractor={(item) => item.id.toString()}
        style={styles.userList}
        showsVerticalScrollIndicator={false}
      />
      
      <View style={styles.serverInfo}>
        <Text style={styles.serverInfoText}>
          Server: {data?.data.serverInfo.nodeVersion} on {data?.data.serverInfo.platform}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginTop: 50,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  userList: {
    flex: 1,
  },
  userCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  serverInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#e8f4f8",
    borderRadius: 8,
  },
  serverInfoText: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#ff3333",
    textAlign: "center",
    marginBottom: 10,
  },
  errorHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
