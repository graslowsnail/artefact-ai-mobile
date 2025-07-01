#!/usr/bin/env tsx

/**
 * 🚀 Met HTML Scraper (PARALLEL VERSION)
 * 
 * Processes multiple artworks simultaneously for MASSIVE speed gains!
 * Uses semaphore to control concurrency and avoid rate limits.
 * 
 * Way better AND faster than their shitty API! 💪
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

// Config
const DRY_RUN = process.argv.includes('--dry-run');
const DELAY = 250; // LUDICROUS SPEED! 💀🚀
const CONCURRENCY = 15; // ABSOLUTELY MENTAL! 10 parallel requests! 🔥💀
const LIMIT = process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : null;

/**
 * Semaphore to control concurrent requests
 */
class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      this.permits--;
      next();
    }
  }
}

/**
 * Extract data from HTML using regex patterns
 */
function extractMetadata(html: string, objectId: number) {
  const data: any = {
    object_id: objectId,
    iiif_image_url: null,
    title: null,
    description: null,
    artist: null,
    date: null,
    culture: null,
    medium: null,
    department: null,
    credit_line: null,
    classification: null,
    artist_bio: null,
    keywords: []
  };

  try {
    // Extract IIIF image URL from og:image meta tag
    const iiifMatch = html.match(/<meta property="og:image" content="([^"]*iiif[^"]*)"[^>]*>/i);
    if (iiifMatch) {
      data.iiif_image_url = iiifMatch[1];
      
      // Extract image ID from IIIF URL
      const imageIdMatch = iiifMatch[1].match(/iiif\/\d+\/(\d+)\//);
      if (imageIdMatch) {
        data.iiif_image_id = imageIdMatch[1];
      }
    }

    // Extract title
    const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"[^>]*>/i) ||
                      html.match(/<title>([^<]*)<\/title>/i);
    if (titleMatch) {
      // Clean up title (remove " | The Metropolitan Museum of Art" etc)
      data.title = titleMatch[1].replace(/\s*\|\s*The Metropolitan Museum of Art.*$/i, '').trim();
    }

    // Extract description from the artwork description div (with validation)
    const descMatch = html.match(/<div[^>]*class="[^"]*artwork__intro__desc[^"]*"[^>]*itemprop="description"[^>]*>\s*<p[^>]*>([^<]+(?:<br[^>]*>[^<]*)*)<\/p>/s);
    if (descMatch) {
      // Clean up the description text
      let description = descMatch[1].trim();
      
      // Remove HTML tags like <br> and clean up
      description = description.replace(/<br[^>]*>/g, ' ')
                              .replace(/\s+/g, ' ')
                              .trim();
      
      // Remove any HTML entities
      description = description.replace(/&amp;/g, '&')
                              .replace(/&lt;/g, '<')
                              .replace(/&gt;/g, '>')
                              .replace(/&quot;/g, '"')
                              .replace(/&#39;/g, "'");
      
      // Only keep if it looks like actual description text (not navigation/CSS/JS)
      if (description && 
          description.length > 30 && 
          description.length < 3000 &&
          !description.includes('arrow keys') &&
          !description.includes('navigate') &&
          !description.includes('tabs below') &&
          !description.includes('{') && 
          !description.includes('}') && 
          !description.includes('function') &&
          !description.includes('px}') &&
          !description.includes('font-') &&
          !description.includes('margin:') &&
          !description.includes('padding:')) {
        data.description = description;
      }
    }

    // Extract keywords from meta tag
    const keywordsMatch = html.match(/<meta name="keywords" content="([^"]*)"[^>]*>/i);
    if (keywordsMatch) {
      data.keywords = keywordsMatch[1].split(',').map(k => k.trim()).filter(k => k);
    }

    // Try to extract more structured data from JSON-LD if present
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([^<]*)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);
        if (jsonData.name) data.title = data.title || jsonData.name;
        if (jsonData.description) data.description = data.description || jsonData.description;
        if (jsonData.creator && jsonData.creator.name) data.artist = jsonData.creator.name;
      } catch (e) {
        // JSON parse failed, ignore
      }
    }

    // Extract more metadata from visible text patterns (with STRONG validation)
    function isValidMetadata(text) {
      return text && 
            text.length > 2 && 
            text.length < 200 &&
            // Reject CSS/JS patterns
            !text.includes('{') && 
            !text.includes('}') && 
            !text.includes('function') &&
            !text.includes('px}') &&
            !text.includes('font-') &&
            !text.includes('margin:') &&
            !text.includes('padding:') &&
            !text.includes('webkit') &&
            !text.includes('background:') &&
            !text.includes('display:') &&
            // Reject URLs and file paths
            !text.includes('http') &&
            !text.includes('//') &&
            !text.includes('.woff') &&
            !text.includes('.css') &&
            !text.includes('.js') &&
            // Reject HTML attributes
            !text.includes('crossorigin') &&
            !text.includes('as=') &&
            !text.includes('type=') &&
            !text.includes('src=') &&
            !text.includes('href=') &&
            // Reject other garbage
            !text.includes('assets/') &&
            !text.includes('dist/') &&
            !text.includes('fonts/');
    }

    // Look for patterns like "Artist Name, dates"
    const artistMatch = html.match(/Artist[^:]*:\s*([^<\n]+)/i);
    if (artistMatch && isValidMetadata(artistMatch[1].trim())) {
      data.artist = artistMatch[1].trim();
    }

    // Look for date patterns
    const dateMatch = html.match(/Date[^:]*:\s*([^<\n]+)/i) ||
      html.match(/(\d{4}[–\-]\d{4}|\d{4}|ca\.\s*\d{4})/);
    if (dateMatch && isValidMetadata(dateMatch[1].trim())) {
      data.date = dateMatch[1].trim();
    }

    // Skip medium extraction - too much CSS/JS garbage, most artworks already have it

    // Look for culture
    const cultureMatch = html.match(/Culture[^:]*:\s*([^<\n]+)/i);
    if (cultureMatch && isValidMetadata(cultureMatch[1].trim())) {
      data.culture = cultureMatch[1].trim();
    }

  } catch (error) {
    console.log(`     ⚠️  Error parsing HTML: ${error}`);
  }

  return data;
}

/**
 * Process a single artwork (async)
 */
async function processArtwork(
  artworkItem: any, 
  semaphore: Semaphore,
  stats: {
    processed: number;
    updated: number;
    skipped: number;
    errors: number;
    newImages: number;
    newDescriptions: number;
  },
  db: any,
  artwork: any,
  eq: any
): Promise<void> {
  await semaphore.acquire();
  
  try {
    stats.processed++;
    
    console.log(`[${stats.processed}] Processing: "${artworkItem.title}" (${artworkItem.object_id})`);
    
    // Fetch the HTML page
    const url = `https://www.metmuseum.org/art/collection/search/${artworkItem.object_id}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`   ❌ HTTP error: ${response.status}`);
      stats.errors++;
      
      // If blocked, slow down the whole process
      if (response.status === 403 || response.status === 429) {
        console.log(`   ⏸️  Rate limited! Slowing down...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      return;
    }
    
    const html = await response.text();
    
    // Check if page has content (not a 404 disguised as 200)
    if (html.includes('Page Not Found') || html.includes('404') || html.length < 1000) {
      console.log(`   ⚠️  Page not found or empty`);
      stats.skipped++;
      return;
    }
    
    // Extract all the metadata
    const metadata = extractMetadata(html, artworkItem.object_id);
    
    // Check what we found and what we actually need
    const foundImage = metadata.iiif_image_url && !artworkItem.current_primary_image;
    const foundDescription = metadata.description && !artworkItem.current_description;
    const foundEnhancedData = metadata.artist || metadata.date || metadata.culture;
    
      if (foundImage || foundDescription || foundEnhancedData) {
      console.log(`   ✅ Found useful data!`);
      if (foundImage) {
        console.log(`      🖼️  New IIIF image: ${metadata.iiif_image_url}`);
        stats.newImages++;
      }
      if (foundDescription) {
        console.log(`      📝 Description: ${metadata.description?.substring(0, 60)}...`);
        stats.newDescriptions++;
      }
      if (foundEnhancedData && !foundImage && !foundDescription) {
        console.log(`      📊 Enhanced: artist=${!!metadata.artist}, date=${!!metadata.date}, culture=${!!metadata.culture}`);
      }
    
      // Update database with rich data
      if (!DRY_RUN) {
        const updateData: any = {};
        
        // Update image if we found one and don't have one
        if (metadata.iiif_image_url && !artworkItem.current_primary_image) {
          updateData.primary_image = metadata.iiif_image_url;
        }
        
        // Always update rich metadata if we found it
        if (metadata.artist) updateData.artist = metadata.artist;
        if (metadata.date) updateData.date = metadata.date;
        if (metadata.culture) updateData.culture = metadata.culture;
        // Skip medium - too unreliable, most artworks already have it
        if (metadata.department) updateData.department = metadata.department;
        if (metadata.credit_line) updateData.credit_line = metadata.credit_line;
        if (metadata.classification) updateData.classification = metadata.classification;
        if (metadata.artist_bio) updateData.artist_display_bio = metadata.artist_bio;
        
        // Use the proper description field now!
        if (metadata.description && !artworkItem.current_description) {
          updateData.description = metadata.description;
        }
        
        if (Object.keys(updateData).length > 0) {
          await db
            .update(artwork)
            .set(updateData)
            .where(eq(artwork.object_id, artworkItem.object_id));
        }
      }
      
      stats.updated++;
    } else {
      console.log(`   ⚠️  No new data found`);
      stats.skipped++;
    }
    
    // Add some random jitter to look more human (MINIMAL FOR MAX SPEED!)
    const jitter = Math.random() * 50; // 0-50ms random delay (LUDICROUS SPEED!)
    await new Promise(resolve => setTimeout(resolve, DELAY + jitter));
    
  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
    stats.errors++;
  } finally {
    semaphore.release();
  }
}

async function main() {
  console.log('\n🚀 Met HTML Scraper (PARALLEL)');
  console.log('===============================');
  console.log(`🔥 Concurrency: ${CONCURRENCY} parallel requests`);
  console.log(`⚡ Delay: ${DELAY}ms + random jitter\n`);
  
  if (DRY_RUN) {
    console.log('🧪 DRY RUN - No database changes\n');
  }

  // Import database stuff dynamically after env vars are loaded
  const { db } = await import('../src/db/index.js');
  const { artwork } = await import('../src/db/schema.js');
  const { desc, eq, or, isNull } = await import('drizzle-orm');

  // Get ONLY artworks that need enhancement
  console.log('🔍 Getting artworks that need enhancement...');
  
  const baseQuery = db
    .select({
      id: artwork.id,
      object_id: artwork.object_id,
      title: artwork.title,
      current_primary_image: artwork.primary_image,
      current_description: artwork.description,
      current_artist: artwork.artist
    })
    .from(artwork)
    .where(
      or(
        isNull(artwork.primary_image),  // Missing image
        isNull(artwork.description),    // Missing description
        isNull(artwork.artist)          // Missing artist
      )
    )
    .orderBy(desc(artwork.object_id)); // Start from highest IDs (newest)
  
  const artworksToScrape = await (LIMIT ? baseQuery.limit(LIMIT) : baseQuery);

  // Better statistics
  let needImage = 0;
  let needDescription = 0; 
  let needArtist = 0;
  artworksToScrape.forEach(art => {
    if (!art.current_primary_image) needImage++;
    if (!art.current_description) needDescription++;
    if (!art.current_artist) needArtist++;
  });

  console.log(`📊 Found ${artworksToScrape.length} artworks to enhance:`);
  console.log(`   🖼️  Need images: ${needImage}`);
  console.log(`   📝 Need descriptions: ${needDescription}`);
  console.log(`   👨‍🎨 Need artist info: ${needArtist}`);
  console.log(`   ⚡ Estimated time: ~${Math.ceil((artworksToScrape.length * (DELAY/1000)) / CONCURRENCY / 3600)} hours\n`);
  
  const stats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    newImages: 0,
    newDescriptions: 0
  };
  
  const startTime = Date.now();
  const semaphore = new Semaphore(CONCURRENCY);

  // Process all artworks in parallel (with concurrency limit)
  const promises = artworksToScrape.map(artworkItem => 
    processArtwork(artworkItem, semaphore, stats, db, artwork, eq)
  );

  // Progress reporting
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = stats.processed / elapsed;
    const eta = Math.ceil((artworksToScrape.length - stats.processed) / rate / 3600);
    
    console.log(`\n📊 Progress: ${stats.processed}/${artworksToScrape.length} | ✅ ${stats.updated} | 🖼️ ${stats.newImages} | 📝 ${stats.newDescriptions} | ⚠️ ${stats.skipped} | ❌ ${stats.errors}`);
    console.log(`⚡ Rate: ${rate.toFixed(1)}/sec | ETA: ${eta > 0 ? eta + 'h' : 'Almost done!'}\n`);
  }, 10000); // Every 10 seconds

  // Wait for all to complete
  await Promise.all(promises);
  clearInterval(progressInterval);
  
  // Final summary with performance stats
  const totalTime = (Date.now() - startTime) / 1000;
  console.log('\n🎉 Parallel Scraping Complete!');
  console.log('===============================');
  console.log(`📊 Total processed: ${stats.processed}`);
  console.log(`✅ Enhanced with rich data: ${stats.updated}`);
  console.log(`🖼️  New images found: ${stats.newImages}`);
  console.log(`📝 New descriptions found: ${stats.newDescriptions}`);
  console.log(`⚠️  Skipped: ${stats.skipped}`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`⏱️  Total time: ${(totalTime / 3600).toFixed(1)} hours`);
  console.log(`⚡ Average rate: ${(stats.processed / totalTime).toFixed(1)} items/sec`);
  console.log(`🔥 Speedup vs sequential: ${((stats.processed / totalTime) / 0.9).toFixed(1)}x faster!`);
  
  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN - No changes made');
  } else {
    console.log('\n🚀 Database updated with enhanced metadata!');
  }
}

// Run it
main().catch(console.error); 