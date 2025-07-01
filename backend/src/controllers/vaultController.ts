import { db } from "../db/index.js";
import { userFavorites, artwork } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export async function toggleFavorite(userId: string, objectId: number) {
  // First, find or create the artwork record
  let artworkRecord = await db
    .select()
    .from(artwork)
    .where(eq(artwork.object_id, objectId))
    .limit(1);

  if (artworkRecord.length === 0) {
    throw new Error(`Artwork with object_id ${objectId} not found in database`);
  }

  const artworkId = artworkRecord[0].id;

  // Check if user already favorited it
  const existingFavorite = await db
    .select()
    .from(userFavorites)
    .where(
      and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.artworkId, artworkId),
      ),
    )
    .limit(1);

  if (existingFavorite.length > 0) {
    // Remove from favorites
    await db
      .delete(userFavorites)
      .where(
        and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.artworkId, artworkId),
        ),
      );
    return { isFavorited: false };
  } else {
    // Add to favorites
    await db.insert(userFavorites).values({
      id: crypto.randomUUID(),
      userId: userId,
      artworkId: artworkId,
    });
    return { isFavorited: true };
  }
}

export async function isFavorited(
  userId: string,
  objectId: number,
): Promise<boolean> {
  // Find artwork record first
  const artworkRecord = await db
    .select()
    .from(artwork)
    .where(eq(artwork.object_id, objectId))
    .limit(1);

  if (artworkRecord.length === 0) {
    return false; // Can't be favorited if artwork doesn't exist
  }

  const favorite = await db
    .select()
    .from(userFavorites)
    .where(
      and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.artworkId, artworkRecord[0].id),
      ),
    )
    .limit(1);

  return favorite.length > 0;
}

export async function getUserFavorites(userId: string) {
  const favorites = await db
    .select({
      id: userFavorites.id,
      artwork_id: userFavorites.artworkId,
      created_at: userFavorites.createdAt,
      // Artwork details with proper snake_case field names
      artwork: {
        id: artwork.id,
        object_id: artwork.object_id,
        title: artwork.title,
        artist: artwork.artist,
        date: artwork.date,
        medium: artwork.medium,
        primary_image: artwork.primary_image,
        department: artwork.department,
        culture: artwork.culture,
        object_url: artwork.object_url,
        credit_line: artwork.credit_line,
        classification: artwork.classification,
      },
    })
    .from(userFavorites)
    .innerJoin(artwork, eq(userFavorites.artworkId, artwork.id))
    .where(eq(userFavorites.userId, userId))
    .orderBy(userFavorites.createdAt); // Show newest favorites first

  return favorites.map(fav => fav.artwork); // Return just the artwork objects
} 