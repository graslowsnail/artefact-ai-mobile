export interface MuseumArtwork {
  id: string;
  object_id: number;
  title: string;
  artist: string;
  date: string;
  medium: string;
  primary_image: string | null;
  department: string;
  culture: string | null;
  created_at: string;
  additional_images: string;
  object_url: string;
  is_highlight: boolean;
  artist_display_bio: string;
  object_begin_date: string;
  object_end_date: string;
  credit_line: string;
  classification: string;
  artist_nationality: string;
  primary_image_small: string | null;
}

// Semantic search result includes similarity score
export interface SemanticArtwork extends MuseumArtwork {
  similarity: number; // Cosine similarity score (0-1, higher = more similar)
  description?: string | null; // Rich description from scraping
  embedding_summary?: string | null; // Enhanced summary from AI
}

export interface ArtworkSearchResponse {
  aiResponse: string;
  artworks: MuseumArtwork[];
  total: number;
}

// Semantic search response includes processed query
export interface SemanticSearchResponse {
  aiResponse: string;
  query: string; // The processed/cleaned query used for embedding
  artworks: SemanticArtwork[];
  total: number;
}

export interface ArtworkSearchRequest {
  query: string;
}

export interface SemanticSearchRequest {
  query: string;
  limit?: number; // Optional limit for results (default: 20, max: 50)
} 