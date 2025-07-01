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
  object_begin_date: number;
  object_end_date: number;
  credit_line: string;
  classification: string;
  artist_nationality: string;
  primary_image_small: string | null;
}

export interface ArtworkSearchResponse {
  aiResponse: string;
  artworks: MuseumArtwork[];
  total: number;
}

export interface ArtworkSearchRequest {
  query: string;
} 