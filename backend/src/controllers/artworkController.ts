import { db } from "../db/index.js";
import { artwork } from "../db/schema.js";
import { eq, inArray, sql, and, isNull } from "drizzle-orm";
import type { MuseumArtwork } from "@shared/types/index.js";

// Update primary_image for specific object_id
export async function updateArtworkImage(object_id: number, primary_image: string) {
  console.log("🖼️ Updating image for artwork:", { object_id, has_image: !!primary_image });
  
  await db
    .update(artwork)
    .set({ primary_image })
    .where(eq(artwork.object_id, object_id));
}

// Update multiple artwork images at once
export async function updateArtworkImages(updates: { object_id: number; primary_image: string }[]) {
  for (const update of updates) {
    await updateArtworkImage(update.object_id, update.primary_image);
  }
}

// Check which object IDs already exist in the database
export async function getExistingObjectIds(objectIds: number[]): Promise<number[]> {
  const existingArtworks = await db
    .select({ object_id: artwork.object_id })
    .from(artwork)
    .where(inArray(artwork.object_id, objectIds));
  
  return existingArtworks.map(art => art.object_id);
}

// Get artworks from database by object IDs in random order
export async function getArtworksByObjectIds(objectIds: number[]): Promise<MuseumArtwork[]> {
  if (objectIds.length === 0) {
    return [];
  }

  const artworks = await db
    .select()
    .from(artwork)
    .where(inArray(artwork.object_id, objectIds))
    .orderBy(sql`RANDOM()`);

  // Transform DB results to match MuseumArtwork interface
  return artworks.map(art => ({
    id: art.id,
    object_id: art.object_id,
    title: art.title,
    artist: art.artist || "",
    date: art.date || "",
    medium: art.medium || "",
    primary_image: art.primary_image,
    department: art.department || "",
    culture: art.culture,
    created_at: art.created_at?.toISOString() || "",
    additional_images: art.additional_images || "[]",
    object_url: art.object_url || "",
    is_highlight: art.is_highlight || false,
    artist_display_bio: art.artist_display_bio || "",
    object_begin_date: art.object_begin_date || 0,
    object_end_date: art.object_end_date || 0,
    credit_line: art.credit_line || "",
    classification: art.classification || "",
    artist_nationality: art.artist_nationality || "",
    primary_image_small: art.primary_image_small,
  }));
}

// Get artworks that need image updates (primary_image is null)
export async function getArtworksNeedingImages(objectIds: number[]): Promise<number[]> {
  if (objectIds.length === 0) {
    return [];
  }

  const artworksWithoutImages = await db
    .select({ object_id: artwork.object_id })
    .from(artwork)
    .where(
      and(
        inArray(artwork.object_id, objectIds),
        isNull(artwork.primary_image)
      )
    );

  return artworksWithoutImages.map((art: { object_id: number }) => art.object_id);
} 