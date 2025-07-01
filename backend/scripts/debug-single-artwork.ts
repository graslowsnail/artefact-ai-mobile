#!/usr/bin/env tsx

/**
 * 🔍 Debug Single Artwork
 * 
 * Test what we can extract from a single artwork page
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

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

  console.log(`🔍 HTML length: ${html.length} characters`);
  console.log(`🔍 Contains 'iiif': ${html.includes('iiif')}`);
  console.log(`🔍 Contains 'og:image': ${html.includes('og:image')}`);
  console.log(`🔍 Contains 'artwork__intro__desc': ${html.includes('artwork__intro__desc')}`);

  try {
    // Extract IIIF image URL from og:image meta tag
    const iiifMatch = html.match(/<meta property="og:image" content="([^"]*iiif[^"]*)"[^>]*>/i);
    if (iiifMatch) {
      data.iiif_image_url = iiifMatch[1];
      console.log(`✅ Found IIIF image: ${data.iiif_image_url}`);
    } else {
      console.log(`❌ No IIIF image found`);
      // Let's see what og:image we do have
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]*)"[^>]*>/i);
      if (ogImageMatch) {
        console.log(`🔍 Found og:image: ${ogImageMatch[1]}`);
      } else {
        console.log(`❌ No og:image found at all`);
      }
    }

    // Extract description from the artwork description div
    const descMatch = html.match(/<div[^>]*class="[^"]*artwork__intro__desc[^"]*"[^>]*>.*?<p[^>]*>([^<]*)<\/p>/s);
    if (descMatch) {
      data.description = descMatch[1].trim();
      console.log(`✅ Found description: ${data.description.substring(0, 100)}...`);
    } else {
      console.log(`❌ No description found`);
      // Let's look for any description-like content
      const anyDescMatch = html.match(/description[^>]*>([^<]+)</i);
      if (anyDescMatch) {
        console.log(`🔍 Found some description content: ${anyDescMatch[1].substring(0, 100)}...`);
      }
    }

    // Extract more metadata from visible text patterns
    const artistMatch = html.match(/Artist[^:]*:\s*([^<\n]+)/i);
    if (artistMatch) {
      data.artist = artistMatch[1].trim();
      console.log(`✅ Found artist: ${data.artist}`);
    } else {
      console.log(`❌ No artist found`);
    }

    const dateMatch = html.match(/Date[^:]*:\s*([^<\n]+)/i) ||
      html.match(/(\d{4}[–\-]\d{4}|\d{4}|ca\.\s*\d{4})/);
    if (dateMatch) {
      data.date = dateMatch[1].trim();
      console.log(`✅ Found date: ${data.date}`);
    }

    const mediumMatch = html.match(/Medium[^:]*:\s*([^<\n]+)/i);
    if (mediumMatch) {
      data.medium = mediumMatch[1].trim();
      console.log(`✅ Found medium: ${data.medium}`);
    }

    const cultureMatch = html.match(/Culture[^:]*:\s*([^<\n]+)/i);
    if (cultureMatch) {
      data.culture = cultureMatch[1].trim();
      console.log(`✅ Found culture: ${data.culture}`);
    }

  } catch (error) {
    console.log(`⚠️ Error parsing HTML: ${error}`);
  }

  return data;
}

async function debugArtwork(objectId: number) {
  console.log(`\n🔍 Debugging artwork ${objectId}`);
  console.log('================================\n');
  
  try {
    const url = `https://www.metmuseum.org/art/collection/search/${objectId}`;
    console.log(`🌐 Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.log(`❌ HTTP error: ${response.status}`);
      return;
    }
    
    const html = await response.text();
    
    if (html.includes('Page Not Found') || html.includes('404')) {
      console.log(`❌ Page not found`);
      return;
    }
    
    const metadata = extractMetadata(html, objectId);
    
    console.log('\n📊 Final extracted metadata:');
    console.log('=============================');
    Object.entries(metadata).forEach(([key, value]) => {
      if (value) {
        console.log(`${key}: ${value}`);
      }
    });
    
  } catch (error) {
    console.log(`❌ Error: ${error}`);
  }
}

// Test with the artwork from the log that was processed
const testObjectId = process.argv[2] ? parseInt(process.argv[2]) : 900748;
debugArtwork(testObjectId); 