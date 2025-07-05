import { Router } from 'express';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { tool } from 'ai';
import { z } from 'zod';
import { updateArtworkImages, getExistingObjectIds, getArtworksByObjectIds, getArtworksNeedingImages } from '../controllers/artworkController.js';
import type { MuseumArtwork, ArtworkSearchRequest, ArtworkSearchResponse, SemanticSearchRequest, SemanticSearchResponse } from '@shared/types/index.js';

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

// OpenAI API response types
interface OpenAIEmbeddingResponse {
    data: Array<{
        embedding: number[];
        index: number;
        object: string;
    }>;
    model: string;
    object: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

// Rate limiting for MET API
let lastMETApiCall = 0;
const MET_API_DELAY = 2000; // 2 seconds between calls

async function searchMET(query: string) {
    console.log("🔍 Searching MET for:", query);

    // Rate limiting: ensure at least 2 seconds between MET API calls
    const now = Date.now();
    const timeSinceLastCall = now - lastMETApiCall;
    if (timeSinceLastCall < MET_API_DELAY) {
        const waitTime = MET_API_DELAY - timeSinceLastCall;
        console.log(`⏸️  Rate limiting: waiting ${waitTime}ms before MET API call`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastMETApiCall = Date.now();

    const baseUrl = "https://collectionapi.metmuseum.org/public/collection/v1/search";
    const searchParams = new URLSearchParams();

    searchParams.append("q", query);
    searchParams.append("hasImages", "true");

    console.log("FETCHING ARTWORK FROM", `${baseUrl}?${searchParams}`);

    const response = await fetch(`${baseUrl}?${searchParams}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    
    // Check if the response is OK and contains JSON
    if (!response.ok) {
        console.error(`❌ MET API error: ${response.status} ${response.statusText}`);
        
        // If rate limited, wait longer before next call
        if (response.status === 403 || response.status === 429) {
            console.log(`⏸️  Rate limited! Waiting 10 seconds before next call...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        throw new Error(`MET API returned ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        console.error(`❌ MET API returned non-JSON response: ${contentType}`);
        const text = await response.text();
        console.error("Response preview:", text.substring(0, 200));
        
        // Check if this looks like a rate limiting/bot protection page
        if (text.includes('ROBOTS') || text.includes('NOINDEX') || text.includes('blocked')) {
            console.log(`⏸️  Detected bot protection! Waiting 30 seconds before next call...`);
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
        
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
                // Rate limiting for individual object requests
                await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between object requests
                
                const objResponse = await fetch(
                    `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
                    {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    }
                );
                
                // Check if individual object response is valid JSON
                if (!objResponse.ok) {
                    console.error(`❌ MET object API error for ${id}: ${objResponse.status}`);
                    
                    // If rate limited, wait longer
                    if (objResponse.status === 403 || objResponse.status === 429) {
                        console.log(`⏸️  Object API rate limited for ${id}! Waiting 5 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                    
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

// POST /api/artwork/semantic-search - NEW VECTOR SEARCH ENDPOINT
router.post('/semantic-search', async (req, res) => {
    try {
        const { query, limit = 20 }: SemanticSearchRequest = req.body;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ 
                error: 'Query is required and must be a string' 
            });
        }

        console.log("🔍 Semantic search request:", query);

        // Step 1: Process query with AI to clean/enhance it
        const messages = [{ role: "user" as const, content: query }];

        const queryProcessing = await generateText({
            model: openai("gpt-4o-mini"), // Using faster model for query processing
            system: `
                You are a virtual museum curator processing search queries.
                Clean and enhance the user's query for semantic search:
                • Keep artistic, cultural, and temporal terms (e.g., "Renaissance", "Japanese", "bronze sculpture")
                • Remove filler words ("please", "show me", "I want to see")
                • Expand vague terms with relevant art concepts
                • If user mentions a culture/period, add related art terms
                • Return a clean, descriptive query suitable for semantic matching
                
                Examples:
                "Show me some Japanese art" → "Japanese art painting calligraphy woodblock print traditional"
                "I want Renaissance paintings" → "Renaissance painting Italian art fresco oil painting classical"
                "Egyptian stuff" → "Egyptian art sculpture hieroglyphics papyrus ancient artifacts"
            `,
            messages,
        });

        const processedQuery = queryProcessing.text.trim();
        console.log("🤖 Processed query:", processedQuery);

        // Step 2: Generate embedding for the processed query
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                input: processedQuery,
                model: 'text-embedding-3-large',
                dimensions: 3072
            }),
        });

        if (!embeddingResponse.ok) {
            throw new Error(`OpenAI embedding failed: ${embeddingResponse.status}`);
        }

        const embeddingData = await embeddingResponse.json() as OpenAIEmbeddingResponse;
        const queryEmbedding = embeddingData.data[0].embedding;
        
        console.log("🧠 Generated query embedding:", queryEmbedding.length, "dimensions");

        // Step 3: Vector similarity search using pgvector
        const { db } = await import('../db/index.js');
        const { artwork } = await import('../db/schema.js');
        const { sql } = await import('drizzle-orm');

        const similarArtworks = await db
            .select({
                id: artwork.id,
                object_id: artwork.object_id,
                title: artwork.title,
                artist: artwork.artist,
                date: artwork.date,
                medium: artwork.medium,
                primary_image: artwork.primary_image,
                primary_image_small: artwork.primary_image_small,
                department: artwork.department,
                culture: artwork.culture,
                classification: artwork.classification,
                artist_nationality: artwork.artist_nationality,
                description: artwork.description,
                embedding_summary: artwork.embedding_summary,
                similarity: sql<number>`1 - (${artwork.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`.as('similarity')
            })
            .from(artwork)
            .where(sql`${artwork.embedding} IS NOT NULL`)
            .orderBy(sql`${artwork.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector`)
            .limit(Math.min(limit, 50)); // Cap at 50 results

        console.log("🎨 Found", similarArtworks.length, "similar artworks");

        // Step 4: Format results

        const response: SemanticSearchResponse = {
            query: processedQuery,
            artworks: similarArtworks.map(artwork => ({
                id: artwork.id,
                object_id: artwork.object_id,
                title: artwork.title,
                artist: artwork.artist || '',
                date: artwork.date || '',
                medium: artwork.medium || '',
                primary_image: artwork.primary_image,
                primary_image_small: artwork.primary_image_small,
                department: artwork.department || '',
                culture: artwork.culture,
                created_at: '',
                additional_images: '',
                object_url: '',
                is_highlight: false,
                artist_display_bio: '',
                object_begin_date: '',
                object_end_date: '',
                credit_line: '',
                classification: artwork.classification || '',
                artist_nationality: artwork.artist_nationality || '',
                description: artwork.description,
                embedding_summary: artwork.embedding_summary,
                similarity: artwork.similarity
            })),
            total: similarArtworks.length,
        };

        console.log(`✅ Semantic search completed: ${response.artworks.length} artworks returned`);
        res.json(response);

    } catch (error) {
        console.error("❌ Semantic search error:", error);
        
        if (error instanceof Error && error.message.includes('OpenAI embedding failed')) {
            res.status(503).json({ 
                error: 'Embedding service temporarily unavailable',
                message: 'The AI embedding service is experiencing issues. Please try again in a few moments.',
                details: error.message
            });
        } else {
            res.status(500).json({ 
                error: 'Internal server error during semantic search',
                message: 'Something went wrong while searching for artworks. Please try again.'
            });
        }
    }
});


export default router; 