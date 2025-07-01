import { Router } from 'express';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import { updateArtworkImages, getExistingObjectIds, getArtworksByObjectIds, getArtworksNeedingImages } from '../controllers/artworkController.js';
import type { MuseumArtwork, ArtworkSearchRequest, ArtworkSearchResponse } from '@shared/types/index.js';

const router = Router();

// MET API response types
interface METSearchResponse {
    total: number;
    objectIDs: number[] | null;
}

interface METObjectResponse {
    objectID: number;
    title: string;
    artistDisplayName: string;
    culture: string;
    objectDate: string;
    medium: string;
    primaryImage: string;
    department: string;
}

async function searchMET(query: string) {
    console.log("🔍 Searching MET for:", query);

    const baseUrl = "https://collectionapi.metmuseum.org/public/collection/v1/search";
    const searchParams = new URLSearchParams();

    searchParams.append("q", query);
    searchParams.append("hasImages", "true");

    console.log("FETCHING ARTWORK FROM", `${baseUrl}?${searchParams}`);

    const response = await fetch(`${baseUrl}?${searchParams}`);
    
    // Check if the response is OK and contains JSON
    if (!response.ok) {
        console.error(`❌ MET API error: ${response.status} ${response.statusText}`);
        throw new Error(`MET API returned ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        console.error(`❌ MET API returned non-JSON response: ${contentType}`);
        const text = await response.text();
        console.error("Response preview:", text.substring(0, 200));
        throw new Error('MET API returned non-JSON response (possibly rate limited or down)');
    }

    const data = await response.json() as METSearchResponse;

    console.log("📊 Found", data.total, "artworks");

    // Get first 50 object IDs
    const objectIds: number[] = data.objectIDs?.slice(0, 50) || [];
    
    // Check which object IDs exist in our database
    const existingObjectIds = await getExistingObjectIds(objectIds);
    
    // Filter to only the objects that exist in our database
    const validObjectIds = objectIds.filter(id => existingObjectIds.includes(id));
    
    // Check which of the valid objects need image updates (primary_image is null)
    const objectsNeedingImages = await getArtworksNeedingImages(validObjectIds);
    
    console.log(`📦 Found ${validObjectIds.length} artworks in database, ${objectsNeedingImages.length} need image updates`);

    // Fetch images for objects that need them
    const imageUpdates: { object_id: number; primary_image: string }[] = [];
    
    if (objectsNeedingImages.length > 0) {
        console.log("🌐 Fetching images from MET API...");
        
        const imagePromises = objectsNeedingImages.map(async (id: number) => {
            try {
                const objResponse = await fetch(
                    `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
                );
                
                // Check if individual object response is valid JSON
                if (!objResponse.ok) {
                    console.error(`❌ MET object API error for ${id}: ${objResponse.status}`);
                    return null;
                }
                
                const objContentType = objResponse.headers.get('content-type');
                if (!objContentType || !objContentType.includes('application/json')) {
                    console.error(`❌ MET object API returned non-JSON for ${id}: ${objContentType}`);
                    return null;
                }
                
                const objData = await objResponse.json() as METObjectResponse;

                // Only update if we got a valid image URL
                if (objData.primaryImage && objData.primaryImage.trim() !== '') {
                    return {
                        object_id: id,
                        primary_image: objData.primaryImage
                    };
                } else {
                    console.log(`⚠️  No image available for artwork ${id}`);
                    return null;
                }
            } catch (error) {
                console.error(`❌ Error fetching image for object ${id}:`, error);
                return null;
            }
        });

        const results = await Promise.all(imagePromises);
        imageUpdates.push(...results.filter(Boolean) as { object_id: number; primary_image: string }[]);
        
        // Update the database with new images
        if (imageUpdates.length > 0) {
            console.log(`🖼️ Updating ${imageUpdates.length} artwork images in database`);
            await updateArtworkImages(imageUpdates);
        }
    }

    // Get all artworks from our DB and filter to only include ones with images
    const allArtworks = await getArtworksByObjectIds(validObjectIds);
    const artworksWithImages = allArtworks.filter(artwork => 
        artwork.primary_image && artwork.primary_image.trim() !== ''
    );

    console.log(`🎨 Returning ${artworksWithImages.length} artworks with images out of ${validObjectIds.length} total`);

    return {
        total: data.total,
        artworks: artworksWithImages,
    };
}

// POST /api/artwork/search
router.post('/search', async (req, res) => {
    try {
        const { query }: ArtworkSearchRequest = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ 
                error: 'Query is required and must be a string' 
            });
        }

        console.log("🎨 Artwork search request:", query);

        // Convert simple query to messages format for AI
        const messages = [
            { role: "user" as const, content: query }
        ];

        const result = await generateText({
            model: openai("gpt-4"),
            system: `
                You are a virtual museum curator.
                When you call the museumSearch tool:
                • Boil the user request down to compact keywords.
                • Drop polite filler ("please", "show me"), articles, and punctuation.
                • Keep culturally or temporally significant words (e.g., "japan", "19th century").
                • If the request is a single broad culture / nationality / era
                (e.g. "Mexican", "Baroque", "Roman"), enrich the query
                by adding 2-4 art-specific words such as "art", "painting",
                "sculpture", "folk", "mural", "ceramic", etc THAT RELATES TO THAT CULTURE THE MOST.
            `,
            messages,
            tools: {
                museumSearch: tool({
                    description: "Search the Metropolitan Museum of Art collection for artworks",
                    parameters: z
                        .object({
                            query: z
                                .string()
                                .describe(
                                    [
                                        "A concise keyword string to send to the Met Museum search API.",
                                        '• Use nouns and adjective modifiers only (omit filler words like "show me").',
                                        "• Include synonyms or related terms if they improve recall.",
                                        "• If the user mentions a time period, medium, or culture, add those words.",
                                        "• If the user gives a vague culture/place/era, append extra art keywords THAT RELATES MOST TO THAT culture/place/era to broaden coverage.",
                                        "• Separate multiple concepts with spaces, not punctuation.",
                                        "Examples:",
                                        '  User: "I want to see Japanese samurai armor from the Edo period"',
                                        '  query -> "samurai armor japan edo"',
                                        '  User: "Paintings of sunflowers by Van Gogh"',
                                        '  query -> "van gogh sunflower"',
                                        '  User: "I want to see something mexican"',
                                        '  query -> "mexican art mural folk"',
                                        '  User: "I want to see something egyptian"',
                                        '  query -> "egyptian art sculpture hieroglyph papyrus"',
                                    ].join("\n"),
                                ),
                        })
                        .strict(),

                    execute: async ({ query }) => {
                        console.log("🤖 AI formatted query:", query);
                        const searchResult = await searchMET(query);
                        return searchResult;
                    },
                }),
            },
        });

        const toolResults = result.toolResults?.[0]?.result;

        const response: ArtworkSearchResponse = {
            aiResponse: result.text,
            artworks: (toolResults?.artworks || []) as MuseumArtwork[],
            total: toolResults?.total || 0,
        };

        console.log(`✅ Search completed: ${response.artworks.length} artworks returned`);
        res.json(response);

    } catch (error) {
        console.error("❌ Artwork search error:", error);
        
        // Check if this is a MET API specific error
        if (error instanceof Error && error.message.includes('MET API')) {
            res.status(503).json({ 
                error: 'Museum API temporarily unavailable',
                message: 'The Metropolitan Museum API is experiencing issues. Please try again in a few moments.',
                details: error.message
            });
        } else {
            res.status(500).json({ 
                error: 'Internal server error during artwork search',
                message: 'Something went wrong while searching for artworks. Please try again.'
            });
        }
    }
});

export default router; 