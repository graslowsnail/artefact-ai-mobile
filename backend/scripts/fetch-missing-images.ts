#!/usr/bin/env tsx

/**
 * 🖼️ Simple Image Fetcher
 * 
 * Loops through ALL artworks in database one by one.
 * If no image, tries to fetch it from Met API.
 * If no image available, skips it.
 * Super simple.
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

// Simple config
const DRY_RUN = process.argv.includes('--dry-run');
const DELAY = 2000; // 3 seconds between requests to avoid rate limits
const LIMIT = process.argv.includes('--limit') ? parseInt(process.argv[process.argv.indexOf('--limit') + 1]) : null;

async function main() {
  console.log('\n🖼️ Simple Image Fetcher');
  console.log('======================\n');
  
  if (DRY_RUN) {
    console.log('🧪 DRY RUN - No database changes\n');
  }

  // Import database stuff dynamically after env vars are loaded
  const { db } = await import('../src/db/index.js');
  const { artwork } = await import('../src/db/schema.js');
  const { isNull, or, eq, desc } = await import('drizzle-orm');

  // Get ALL artworks that don't have images
  console.log('🔍 Finding artworks without images...');
  
  const allArtworks = await db
    .select({
      id: artwork.id,
      object_id: artwork.object_id,
      title: artwork.title
    })
    .from(artwork)
    .where(
      or(
        isNull(artwork.primary_image),
        eq(artwork.primary_image, ''),
        eq(artwork.primary_image, 'null')
      )
    )
    .orderBy(desc(artwork.id));
    
  const artworksWithoutImages = LIMIT ? allArtworks.slice(0, LIMIT) : allArtworks;

  console.log(`📊 Found ${artworksWithoutImages.length} artworks without images\n`);
  
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Loop through each artwork one by one
  for (const artworkItem of artworksWithoutImages) {
    processed++;
    
    try {
      console.log(`[${processed}/${artworksWithoutImages.length}] Processing: "${artworkItem.title}" (${artworkItem.object_id})`);
      
      // Fetch from Met API
      const response = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${artworkItem.object_id}`);
      
             if (!response.ok) {
         console.log(`   ❌ API error: ${response.status}`);
         errors++;
         
         // If rate limited, wait extra long
         if (response.status === 403) {
           console.log(`   ⏸️  Rate limited! Waiting 10 seconds...`);
           await new Promise(resolve => setTimeout(resolve, 10000));
         }
         
         continue;
       }
      
      const data = await response.json();
      
      // Check if it has an image
      if (!data.primaryImage || data.primaryImage.trim() === '') {
        console.log(`   ⚠️  No image available`);
        skipped++;
      } else {
        console.log(`   ✅ Found image, updating...`);
        
        // Update database
        if (!DRY_RUN) {
          await db
            .update(artwork)
            .set({ 
              primary_image: data.primaryImage,
              primary_image_small: data.primaryImageSmall || null
            })
            .where(eq(artwork.object_id, artworkItem.object_id));
        }
        
        updated++;
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
      errors++;
    }
    
    // Progress update every 100
    if (processed % 100 === 0) {
      console.log(`\n📊 Progress: ${processed}/${artworksWithoutImages.length} | ✅ ${updated} | ⚠️ ${skipped} | ❌ ${errors}\n`);
    }
    
    // Wait 1 second
    await new Promise(resolve => setTimeout(resolve, DELAY));
  }
  
  // Final summary
  console.log('\n🎉 Done!');
  console.log('========');
  console.log(`📊 Total processed: ${processed}`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  
  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN - No changes made');
  }
}

// Run it
main().catch(console.error); 