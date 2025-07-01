#!/usr/bin/env tsx

/**
 * 🕵️ Met HTML Scraper
 * 
 * Scrapes actual Met website pages to get:
 * - Rich descriptions and context
 * - High-res IIIF image URLs  
 * - Complete metadata
 * - Artist stories and details
 * 
 * Way better than their shitty API! 💪
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
const DELAY = 1000; // 1 second between requests (faster than API!)
const LIMIT = process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : null;

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

    // Extract description from the artwork description div
    const descMatch = html.match(/<div[^>]*class="[^"]*artwork__intro__desc[^"]*"[^>]*>.*?<p[^>]*>([^<]*)<\/p>/s);
    if (descMatch) {
      data.description = descMatch[1].trim();
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

    // Extract more metadata from visible text patterns
    // Look for patterns like "Artist Name, dates"
    const artistMatch = html.match(/Artist[^:]*:\s*([^<\n]+)/i);
    if (artistMatch) {
      data.artist = artistMatch[1].trim();
    }

    // Look for date patterns
    const dateMatch = html.match(/Date[^:]*:\s*([^<\n]+)/i) ||
      html.match(/(\d{4}[–\-]\d{4}|\d{4}|ca\.\s*\d{4})/);
    if (dateMatch) {
      data.date = dateMatch[1].trim();
    }

    // Look for medium
    const mediumMatch = html.match(/Medium[^:]*:\s*([^<\n]+)/i);
    if (mediumMatch) {
      data.medium = mediumMatch[1].trim();
    }

    // Look for culture
    const cultureMatch = html.match(/Culture[^:]*:\s*([^<\n]+)/i);
    if (cultureMatch) {
      data.culture = cultureMatch[1].trim();
    }

  } catch (error) {
    console.log(`     ⚠️  Error parsing HTML: ${error}`);
  }

  return data;
}

async function main() {
  console.log('\n �️Met HTML Scraper');
  console.log('===================\n');
  
  if (DRY_RUN) {
    console.log('🧪 DRY RUN - No database changes\n');
  }

  // Import database stuff dynamically after env vars are loaded
  const { db } = await import('../src/db/index.js');
  const { artwork } = await import('../src/db/schema.js');
  const { desc, eq } = await import('drizzle-orm');

  // Get ALL artworks (we want to enhance existing data too)
  console.log('🔍 Getting artworks to scrape...');
  
  let query = db
    .select({
      id: artwork.id,
      object_id: artwork.object_id,
      title: artwork.title,
      current_primary_image: artwork.primary_image
    })
    .from(artwork)
    .orderBy(desc(artwork.object_id)); // Start from highest IDs (newest)
    
  if (LIMIT) {
    query = query.limit(LIMIT);
  }
  
  const artworksToScrape = await query;

  console.log(`📊 Found ${artworksToScrape.length} artworks to scrape\n`);
  
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let newImages = 0;
  let newDescriptions = 0;

  // Loop through each artwork
  for (const artworkItem of artworksToScrape) {
    processed++;
    
    try {
      console.log(`[${processed}/${artworksToScrape.length}] Scraping: "${artworkItem.title}" (${artworkItem.object_id})`);
      
      // Fetch the HTML page
      const url = `https://www.metmuseum.org/art/collection/search/${artworkItem.object_id}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        console.log(`   ❌ HTTP error: ${response.status}`);
        errors++;
        
        // If blocked, wait longer
        if (response.status === 403 || response.status === 429) {
          console.log(`   ⏸️  Rate limited! Waiting 10 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        continue;
      }
      
      const html = await response.text();
      
      // Check if page has content (not a 404 disguised as 200)
      if (html.includes('Page Not Found') || html.includes('404')) {
        console.log(`   ⚠️  Page not found`);
        skipped++;
        continue;
      }
      
      // Extract all the metadata
      const metadata = extractMetadata(html, artworkItem.object_id);
      
      // Check what we found
      const foundImage = metadata.iiif_image_url && !artworkItem.current_primary_image;
      const foundDescription = metadata.description;
      const foundEnhancedData = metadata.artist || metadata.date || metadata.culture || metadata.medium;
      
      if (foundImage || foundDescription || foundEnhancedData) {
        console.log(`   ✅ Found rich data!`);
        if (foundImage) {
          console.log(`      🖼️  New IIIF image: ${metadata.iiif_image_url}`);
          newImages++;
        }
        if (foundDescription) {
          console.log(`      📝 Description: ${metadata.description?.substring(0, 100)}...`);
          newDescriptions++;
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
          if (metadata.medium) updateData.medium = metadata.medium;
          if (metadata.department) updateData.department = metadata.department;
          if (metadata.credit_line) updateData.credit_line = metadata.credit_line;
          if (metadata.classification) updateData.classification = metadata.classification;
          if (metadata.artist_bio) updateData.artist_display_bio = metadata.artist_bio;
          
          // For now, store description in credit_line if we don't have a description field
          // TODO: Add description field to schema
          if (metadata.description && !updateData.credit_line) {
            updateData.credit_line = metadata.description;
          }
          
          if (Object.keys(updateData).length > 0) {
            await db
              .update(artwork)
              .set(updateData)
              .where(eq(artwork.object_id, artworkItem.object_id));
          }
        }
        
        updated++;
      } else {
        console.log(`   ⚠️  No useful data found`);
        skipped++;
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
      errors++;
    }
    
    // Progress update every 50
    if (processed % 50 === 0) {
      console.log(`\n📊 Progress: ${processed}/${artworksToScrape.length} | ✅ ${updated} | 🖼️ ${newImages} | 📝 ${newDescriptions} | ⚠️ ${skipped} | ❌ ${errors}\n`);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, DELAY));
  }
  
  // Final summary
  console.log('\n🎉 Scraping Complete!');
  console.log('====================');
  console.log(`📊 Total processed: ${processed}`);
  console.log(`✅ Enhanced with rich data: ${updated}`);
  console.log(`🖼️  New images found: ${newImages}`);
  console.log(`📝 New descriptions found: ${newDescriptions}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  
  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN - No changes made');
  } else {
    console.log('\n🚀 Database updated with enhanced metadata!');
  }
}

// Run it
main().catch(console.error);