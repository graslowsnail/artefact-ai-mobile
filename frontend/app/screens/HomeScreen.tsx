import React, { useState, useEffect, useRef } from "react";
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    FlatList,
    ActivityIndicator,
    ScrollView,
    ImageBackground,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Animated,
    RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSession } from "../../lib/auth-client";
import type {
    MuseumArtwork,
    ArtworkSearchResponse,
    SemanticSearchResponse,
    SemanticArtwork,
} from "../../../shared/types/index";
import ArtworkCard from "../components/ArtworkCard";
import GlassCard from "../components/GlassCard";
import { API_BASE_URL } from "../../config/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

interface HomeScreenProps {
    onArtworkPress: (artwork: MuseumArtwork) => void;
    onVaultPress: () => void;
    onSignOut: () => void;
    // Search state props
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    aiSearchResults: SemanticArtwork[];
    setAiSearchResults: (results: SemanticArtwork[]) => void;
    aiSearchLoading: boolean;
    setAiSearchLoading: (loading: boolean) => void;
    aiSearchError: string | null;
    setAiSearchError: (error: string | null) => void;
    aiHasSearched: boolean;
    setAiHasSearched: (hasSearched: boolean) => void;
    museumSearchResults: MuseumArtwork[];
    setMuseumSearchResults: (results: MuseumArtwork[]) => void;
    museumSearchLoading: boolean;
    setMuseumSearchLoading: (loading: boolean) => void;
    museumSearchError: string | null;
    setMuseumSearchError: (error: string | null) => void;
    museumHasSearched: boolean;
    setMuseumHasSearched: (hasSearched: boolean) => void;
    useSemanticSearch: boolean;
    setUseSemanticSearch: (useSemanticSearch: boolean) => void;
}

export default function HomeScreen({
    onArtworkPress,
    onVaultPress,
    onSignOut,
    // Search state props
    searchQuery,
    setSearchQuery,
    aiSearchResults,
    setAiSearchResults,
    aiSearchLoading,
    setAiSearchLoading,
    aiSearchError,
    setAiSearchError,
    aiHasSearched,
    setAiHasSearched,
    museumSearchResults,
    setMuseumSearchResults,
    museumSearchLoading,
    setMuseumSearchLoading,
    museumSearchError,
    setMuseumSearchError,
    museumHasSearched,
    setMuseumHasSearched,
    useSemanticSearch,
    setUseSemanticSearch,
}: HomeScreenProps) {
    const { data: session } = useSession();
    
    // Remove all the local search state - now comes from props
    // const [searchQuery, setSearchQuery] = useState("");
    // const [aiSearchResults, setAiSearchResults] = useState<SemanticArtwork[]>([]);
    // ... etc
    
    const [loadingVault, setLoadingVault] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pullProgress, setPullProgress] = useState(0);
    const [lastHapticThreshold, setLastHapticThreshold] = useState(0);
    const [isAtMaxPull, setIsAtMaxPull] = useState(false);

    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const insets = useSafeAreaInsets();
    const bottomPosition = useRef(new Animated.Value(0)).current;

    // Keyboard height tracking with smooth animation
    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            (e) => {
                setKeyboardHeight(e.endCoordinates.height);
                Animated.timing(bottomPosition, {
                    toValue: e.endCoordinates.height - insets.bottom + 16, // Add 16px spacing
                    duration:
                        Platform.OS === "ios"
                            ? Math.min(e.duration || 150, 150)
                            : 150,
                    useNativeDriver: false,
                }).start();
            }
        );

        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            (e) => {
                setKeyboardHeight(0);
                Animated.timing(bottomPosition, {
                    toValue: 0,
                    duration:
                        Platform.OS === "ios"
                            ? Math.min(e.duration || 150, 150)
                            : 150,
                    useNativeDriver: false,
                }).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, [insets.bottom]);

    const performSearch = async (queryOverride?: string) => {
        const queryToUse = queryOverride || searchQuery;
        if (!queryToUse.trim()) {
            Alert.alert("Error", "Please enter a search query");
            return;
        }

        // Clear both search states before performing a new search
        setAiSearchResults([]);
        setMuseumSearchResults([]);
        setAiHasSearched(false);
        setMuseumHasSearched(false);

        try {
            if (useSemanticSearch) {
                setAiSearchLoading(true);
                setAiHasSearched(true);
            } else {
                setMuseumSearchLoading(true);
                setMuseumHasSearched(true);
            }

            const endpoint = useSemanticSearch ? "/semantic-search" : "/search";
            const response = await fetch(
                `${API_BASE_URL}/api/artwork${endpoint}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ query: queryToUse, limit: 50 }),
                }
            );

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(
                        errorData.message || errorData.error || "Search failed"
                    );
                } catch {
                    throw new Error(
                        `Search failed with status ${response.status}`
                    );
                }
            }

            if (useSemanticSearch) {
                const data: SemanticSearchResponse = await response.json();
                setAiSearchResults(data.artworks);

                if (data.artworks.length === 0) {
                    Alert.alert(
                        "No Results",
                        "No artworks found for your search. Try different keywords!"
                    );
                }
            } else {
                const data: ArtworkSearchResponse = await response.json();
                console.log("🌐 Met Museum search results:", {
                    total: data.total,
                    artworksCount: data.artworks.length,
                });
                setMuseumSearchResults(data.artworks);

                if (data.artworks.length === 0) {
                    Alert.alert(
                        "No Results",
                        "No artworks found for your search. Try different keywords!"
                    );
                }
            }
        } catch (error) {
            console.error("Search error:", error);

            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Failed to search artworks. Please try again.";

            if (errorMessage.includes("Museum API temporarily unavailable")) {
                Alert.alert(
                    "Museum API Issues",
                    "The Met Museum API is having temporary issues. Please try again in a few moments.",
                    [{ text: "OK" }]
                );
            } else if (
                errorMessage.includes(
                    "Embedding service temporarily unavailable"
                )
            ) {
                Alert.alert(
                    "AI Search Unavailable",
                    "The AI semantic search is temporarily unavailable. Try switching to regular search.",
                    [{ text: "OK" }]
                );
            } else {
                Alert.alert("Search Error", errorMessage);
            }
        } finally {
            if (useSemanticSearch) {
                setAiSearchLoading(false);
            } else {
                setMuseumSearchLoading(false);
            }
        }
    };

    // Wrapper function for event handlers
    const handleSearch = async () => {
        await performSearch();
    };

    // Handle scroll for progress tracking
    const handleScroll = (event: any) => {
        const { contentOffset } = event.nativeEvent;
        const scrollY = contentOffset.y;

        // Only track when pulling down (negative scroll) and we have results
        const hasResults =
            (useSemanticSearch && aiSearchResults.length > 0) ||
            (!useSemanticSearch && museumSearchResults.length > 0);
        const hasSearched =
            (useSemanticSearch && aiHasSearched) ||
            (!useSemanticSearch && museumHasSearched);

        if (scrollY < 0 && hasSearched && hasResults) {
            const maxPullDistance = height * 0.15; // 15% of screen height
            const progress = Math.min(Math.abs(scrollY) / maxPullDistance, 1);
            setPullProgress(progress);

            // Track if we're at max pull (100%)
            const atMaxPull = progress >= 1;
            setIsAtMaxPull(atMaxPull);

            // Haptic feedback at different thresholds
            const currentThreshold = Math.floor(progress * 4); // 0, 1, 2, 3 (25%, 50%, 75%, 100%)
            if (
                currentThreshold > lastHapticThreshold &&
                currentThreshold <= 3
            ) {
                Haptics.impactAsync(
                    currentThreshold === 3
                        ? Haptics.ImpactFeedbackStyle.Heavy
                        : Haptics.ImpactFeedbackStyle.Light
                );
                setLastHapticThreshold(currentThreshold);
            }
        } else {
            setPullProgress(0);
            setLastHapticThreshold(0);
            setIsAtMaxPull(false);
        }
    };

    // Handle touch end - check if user releases at 100%
    const handleTouchEnd = () => {
        if (isAtMaxPull && !refreshing) {
            // User released at 100% - clear results
            handleClearResults();
        }
    };

    // Handle clearing results when user releases at 100%
    const handleClearResults = async () => {
        setRefreshing(true);

        // Final haptic feedback
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Clear search results and reset to welcome state
        setSearchQuery("");
        setAiSearchResults([]);
        setAiHasSearched(false);
        setAiSearchLoading(false);
        setAiSearchError(null);
        setMuseumSearchResults([]);
        setMuseumHasSearched(false);
        setMuseumSearchLoading(false);
        setMuseumSearchError(null);
        setPullProgress(0);
        setLastHapticThreshold(0);
        setIsAtMaxPull(false);
        setUseSemanticSearch(true); // Reset to default AI search

        // Small delay for smooth UX
        setTimeout(() => {
            setRefreshing(false);
        }, 500);
    };

    const handleVaultPress = async () => {
        setLoadingVault(true);
        try {
            await onVaultPress();
        } finally {
            setLoadingVault(false);
        }
    };

    const renderArtworkCard = ({
        item,
    }: {
        item: MuseumArtwork | SemanticArtwork;
    }) => (
        <ArtworkCard
            artwork={item}
            onPress={() => onArtworkPress(item)}
            similarity={
                useSemanticSearch
                    ? (item as SemanticArtwork).similarity
                    : undefined
            }
        />
    );

    // Update toggle logic to auto-search when switching to empty search type
    const handleToggleSearchMode = async (useSemantic: boolean) => {
        setUseSemanticSearch(useSemantic);

        // Check if we need to auto-search when switching modes
        if (useSemantic && aiSearchResults.length === 0 && searchQuery.trim()) {
            setAiSearchLoading(true);
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/artwork/semantic-search`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ query: searchQuery, limit: 50 }),
                    }
                );

                if (!response.ok) {
                    throw new Error("AI search failed");
                }

                const data: SemanticSearchResponse = await response.json();
                setAiSearchResults(data.artworks);
                setAiHasSearched(true);
            } catch (error) {
                console.error("Auto AI search error:", error);
                setAiSearchError("Failed to load AI search results");
            } finally {
                setAiSearchLoading(false);
            }
        } else if (
            !useSemantic &&
            museumSearchResults.length === 0 &&
            searchQuery.trim()
        ) {
            setMuseumSearchLoading(true);
            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/artwork/search`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ query: searchQuery, limit: 50 }),
                    }
                );

                if (!response.ok) {
                    throw new Error("Museum search failed");
                }

                const data: ArtworkSearchResponse = await response.json();
                setMuseumSearchResults(data.artworks);
                setMuseumHasSearched(true);
            } catch (error) {
                console.error("Auto Museum search error:", error);
                setMuseumSearchError("Failed to load Museum search results");
            } finally {
                setMuseumSearchLoading(false);
            }
        }
    };

    return (
        <View style={styles.container}>
            {/* Vintage Scientific Background */}
            <ImageBackground
                source={require("../../assets/images/vintage-scientific-bg-3.png")}
                style={styles.backgroundImage}
                resizeMode="cover"
            />

            {/* Content Overlay */}
            <LinearGradient
                colors={[
                    "rgba(248, 249, 250, 0.25)",
                    "rgba(248, 249, 250, 0.15)",
                ]}
                style={styles.contentOverlay}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.topBar}>
                        <TouchableOpacity
                            style={styles.vaultButton}
                            onPress={handleVaultPress}
                            disabled={loadingVault}
                        >
                            <Text style={styles.vaultButtonText}>
                                {loadingVault ? "Loading..." : "Your Vault"}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.title}>Artefact AI</Text>

                        <TouchableOpacity
                            style={styles.signOutButton}
                            onPress={onSignOut}
                        >
                            <Text style={styles.signOutButtonText}>
                                Sign Out
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        {useSemanticSearch
                            ? "AI-powered semantic art discovery"
                            : "Discover amazing artwork with natural language"}
                    </Text>
                </View>

                {/* Pull Progress Bar - Hidden under header, slides down when pulling */}
                {pullProgress > 0 &&
                    ((useSemanticSearch &&
                        aiHasSearched &&
                        aiSearchResults.length > 0) ||
                        (!useSemanticSearch &&
                            museumHasSearched &&
                            museumSearchResults.length > 0)) && (
                        <View
                            style={[
                                styles.pullProgressContainer,
                                {
                                    transform: [
                                        { translateY: pullProgress * 60 - 60 },
                                    ],
                                    opacity: pullProgress,
                                },
                            ]}
                        >
                            <View style={styles.pullProgressBar}>
                                <View
                                    style={[
                                        styles.pullProgressFill,
                                        { width: `${pullProgress * 100}%` },
                                    ]}
                                />
                            </View>
                            <Text style={styles.pullProgressText}>
                                {pullProgress < 1
                                    ? `Pull to clear results (${Math.round(
                                          pullProgress * 100
                                      )}%)`
                                    : "Release to clear results!"}
                            </Text>
                        </View>
                    )}

                {/* Scrollable Content */}
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    onTouchEnd={handleTouchEnd}
                    refreshControl={
                        (useSemanticSearch &&
                            aiHasSearched &&
                            aiSearchResults.length > 0) ||
                        (!useSemanticSearch &&
                            museumHasSearched &&
                            museumSearchResults.length > 0) ? (
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => {}} // Empty function - we handle clearing manually
                                tintColor="transparent"
                                title=""
                                colors={["transparent"]}
                                progressBackgroundColor="transparent"
                                style={{
                                    backgroundColor: "transparent",
                                }}
                            />
                        ) : undefined
                    }
                >
                    {/* Results Section */}
                    {((useSemanticSearch && aiSearchLoading) ||
                        (!useSemanticSearch && museumSearchLoading)) && (
                        <GlassCard style={styles.centeredContainer}>
                            <ActivityIndicator size="large" color="#a78bfa" />
                            <Text style={styles.loadingText}>
                                {useSemanticSearch
                                    ? "Using AI to find semantically similar artworks..."
                                    : "Searching for amazing artworks..."}
                            </Text>
                        </GlassCard>
                    )}

                    {!(
                        (useSemanticSearch && aiSearchLoading) ||
                        (!useSemanticSearch && museumSearchLoading)
                    ) &&
                        ((useSemanticSearch && aiSearchResults.length === 0 && aiHasSearched) ||
                            (!useSemanticSearch &&
                                museumSearchResults.length === 0 && museumHasSearched)) && (
                            <GlassCard style={styles.centeredContainer}>
                                <Text style={styles.noResultsText}>
                                    No artworks found
                                </Text>
                                <Text style={styles.noResultsSubtext}>
                                    Try different search terms
                                </Text>
                            </GlassCard>
                        )}

                    {!(
                        (useSemanticSearch && aiSearchLoading) ||
                        (!useSemanticSearch && museumSearchLoading)
                    ) &&
                        ((useSemanticSearch && aiSearchResults.length > 0) ||
                            (!useSemanticSearch &&
                                museumSearchResults.length > 0)) && (
                            <GlassCard>
                                <Text style={styles.resultsTitle}>
                                    Found{" "}
                                    {useSemanticSearch
                                        ? aiSearchResults.length
                                        : museumSearchResults.length}{" "}
                                    artworks
                                    {useSemanticSearch &&
                                        " (sorted by similarity)"}
                                </Text>
                                <FlatList
                                    data={
                                        useSemanticSearch
                                            ? aiSearchResults
                                            : museumSearchResults
                                    }
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

                    {!((useSemanticSearch && (aiHasSearched || aiSearchLoading)) || (!useSemanticSearch && (museumHasSearched || museumSearchLoading))) && (
                        <GlassCard>
                            <Text style={styles.quickSearchTitle}>
                                Quick Search Suggestions
                            </Text>
                            <View style={styles.suggestionsContainer}>
                                <TouchableOpacity
                                    style={styles.suggestionButton}
                                    onPress={() => {
                                        setSearchQuery(
                                            "impressionist paintings"
                                        );
                                        setUseSemanticSearch(true);
                                        performSearch(
                                            "impressionist paintings"
                                        );
                                    }}
                                >
                                    <Text style={styles.suggestionText}>
                                        Impressionist Paintings
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.suggestionButton}
                                    onPress={() => {
                                        setSearchQuery("ancient sculptures");
                                        setUseSemanticSearch(true);
                                        performSearch("ancient sculptures");
                                    }}
                                >
                                    <Text style={styles.suggestionText}>
                                        Ancient Sculptures
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.suggestionButton}
                                    onPress={() => {
                                        setSearchQuery("modern abstract art");
                                        setUseSemanticSearch(true);
                                        performSearch("modern abstract art");
                                    }}
                                >
                                    <Text style={styles.suggestionText}>
                                        Modern Abstract Art
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.suggestionButton}
                                    onPress={() => {
                                        setSearchQuery("renaissance portraits");
                                        setUseSemanticSearch(true);
                                        performSearch("renaissance portraits");
                                    }}
                                >
                                    <Text style={styles.suggestionText}>
                                        Renaissance Portraits
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.suggestionButton}
                                    onPress={() => {
                                        setSearchQuery("japanese art");
                                        setUseSemanticSearch(true);
                                        performSearch("japanese art");
                                    }}
                                >
                                    <Text style={styles.suggestionText}>
                                        Japanese Art
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.suggestionButton}
                                    onPress={() => {
                                        setSearchQuery("art from america");
                                        setUseSemanticSearch(true);
                                        performSearch("art from america");
                                    }}
                                >
                                    <Text style={styles.suggestionText}>
                                        art from america
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </GlassCard>
                    )}
                </ScrollView>
            </LinearGradient>

            {/* Bottom Search Bar */}
            <Animated.View
                style={[
                    styles.bottomSearchContainer,
                    {
                        bottom: bottomPosition,
                    },
                ]}
            >
                {/* Search Mode Toggle */}
                <View style={styles.bottomToggleContainer}>
                    <TouchableOpacity
                        style={[
                            styles.bottomToggleButton,
                            useSemanticSearch &&
                                styles.bottomToggleButtonActive,
                        ]}
                        onPress={() => handleToggleSearchMode(true)}
                    >
                        <Text
                            style={[
                                styles.bottomToggleText,
                                useSemanticSearch &&
                                    styles.bottomToggleTextActive,
                            ]}
                        >
                            AI Search
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.bottomToggleButton,
                            !useSemanticSearch &&
                                styles.bottomToggleButtonActive,
                        ]}
                        onPress={() => handleToggleSearchMode(false)}
                    >
                        <Text
                            style={[
                                styles.bottomToggleText,
                                !useSemanticSearch &&
                                    styles.bottomToggleTextActive,
                            ]}
                        >
                            Museum Search
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Search Input */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder={
                            useSemanticSearch
                                ? "Describe what you're looking for..."
                                : "Search artwork..."
                        }
                        placeholderTextColor="#8E8E93"
                        editable={!aiSearchLoading}
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity
                        style={[
                            styles.searchButton,
                            aiSearchLoading && styles.searchButtonDisabled,
                        ]}
                        onPress={handleSearch}
                        disabled={aiSearchLoading}
                    >
                        {aiSearchLoading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.searchButtonText}>
                                {useSemanticSearch ? "Search" : "Search"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        position: "absolute",
        width: width,
        height: height,
    },
    contentOverlay: {
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 110, // Extra space for bottom search bar
    },
    header: {
        paddingTop: 55,
        paddingHorizontal: 20,
        paddingBottom: 15,
        alignItems: "center",
        backgroundColor: "rgba(180, 180, 180, 0.6)",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(150, 150, 150, 0.4)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    topBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1C1C1E",
        letterSpacing: -0.5,
        textAlign: "center",
        flex: 1,
    },
    subtitle: {
        fontSize: 17,
        color: "#6C6C70",
        textAlign: "center",
        fontWeight: "400",
        marginTop: 4,
    },
    vaultButton: {
        backgroundColor: "rgba(255, 215, 0, 0.95)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
        minWidth: 60,
    },
    vaultButtonText: {
        color: "#1C1C1E",
        fontSize: 12,
        fontWeight: "600",
    },
    signOutButton: {
        backgroundColor: "rgba(220, 38, 38, 0.95)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignItems: "center",
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
        minWidth: 60,
    },
    signOutButtonText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "600",
    },
    centeredContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
    },
    quickSearchTitle: {
        fontSize: 22,
        fontWeight: "600",
        color: "#1C1C1E",
        textAlign: "center",
        marginBottom: 20,
        textShadowColor: "rgba(255, 255, 255, 0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    suggestionsContainer: {
        flexDirection: "column",
        gap: 12,
    },
    suggestionButton: {
        width: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: "flex-start",
        borderWidth: 1,
        borderColor: "rgba(150, 150, 150, 0.3)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    suggestionText: {
        fontSize: 15,
        fontWeight: "500",
        color: "#1C1C1E",
        textAlign: "center",
        textShadowColor: "rgba(255, 255, 255, 0.6)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    bottomToggleContainer: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        borderRadius: 20,
        padding: 4,
        marginBottom: 12,
        gap: 4,
    },
    bottomToggleButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        alignItems: "center",
    },
    bottomToggleButtonActive: {
        backgroundColor: "rgba(167, 139, 250, 1)",
        shadowColor: "#a78bfa",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    bottomToggleText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#8E8E93",
    },
    bottomToggleTextActive: {
        color: "#FFFFFF",
    },
    toggleButton: {
        backgroundColor: "rgba(180, 180, 180, 0.6)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: "rgba(150, 150, 150, 0.4)",
    },
    toggleButtonActive: {
        backgroundColor: "rgba(167, 139, 250, 0.95)",
        shadowColor: "#a78bfa",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    toggleText: {
        color: "#1C1C1E",
        fontSize: 14,
        fontWeight: "600",
    },
    toggleTextActive: {
        color: "#FFFFFF",
    },
    bottomSearchContainer: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(180, 180, 180, 0.6)",
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 34 : 20,
        borderTopWidth: 1,
        borderTopColor: "rgba(150, 150, 150, 0.5)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    searchContainer: {
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
    },
    searchInput: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        borderRadius: 25,
        paddingHorizontal: 20,
        paddingVertical: 14,
        fontSize: 16,
        color: "#1C1C1E",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.4)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    searchButton: {
        backgroundColor: "rgba(167, 139, 250, 1)",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        minWidth: 90,
        shadowColor: "#a78bfa",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    searchButtonDisabled: {
        opacity: 0.6,
    },
    searchButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        letterSpacing: -0.2,
    },

    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: "#1C1C1E",
        textAlign: "center",
        textShadowColor: "rgba(255, 255, 255, 0.6)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },

    noResultsText: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1C1C1E",
        marginBottom: 8,
        textShadowColor: "rgba(255, 255, 255, 0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    noResultsSubtext: {
        fontSize: 16,
        color: "#1C1C1E",
        textAlign: "center",
        textShadowColor: "rgba(255, 255, 255, 0.6)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },

    resultsTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1C1C1E",
        marginVertical: 16,
        textShadowColor: "rgba(255, 255, 255, 0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    artworksList: {
        paddingBottom: 20,
    },
    row: {
        justifyContent: "space-between",
    },
    pullProgressContainer: {
        position: "absolute",
        top: 140, // Position it below the header (after title and subtitle)
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 20,
        paddingVertical: 12,
        alignItems: "center",
        backgroundColor: "rgba(180, 180, 180, 0.9)",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(150, 150, 150, 0.4)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    pullProgressBar: {
        width: "100%",
        height: 6,
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    pullProgressFill: {
        height: "100%",
        backgroundColor: "#a78bfa",
        borderRadius: 3,
        shadowColor: "#a78bfa",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    pullProgressText: {
        fontSize: 14,
        color: "#1C1C1E",
        fontWeight: "600",
        textAlign: "center",
        textShadowColor: "rgba(255, 255, 255, 0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
