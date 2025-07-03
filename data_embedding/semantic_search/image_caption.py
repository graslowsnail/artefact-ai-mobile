#!/usr/bin/env python3
"""
🖼️ Image Caption Generator using BLIP2
Processes artwork images and generates captions using BLIP2 model
"""

import torch
from PIL import Image
import requests
from transformers import BlipProcessor, BlipForConditionalGeneration
import psycopg2
import os
from io import BytesIO
import time
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables from backend
load_dotenv('../../backend/.env')

class ImageCaptioner:
    def __init__(self):
        print("🚀 Initializing BLIP2 Image Captioner...")
        
        # Load model and processor
        print("📦 Loading BLIP2 model (this may take a while on first run)...")
        self.processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
        self.model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-large")
        
        # Detect and use best available device
        if torch.backends.mps.is_available():
            self.device = "mps"
            print("✅ Using Apple Silicon GPU (MPS)")
        elif torch.cuda.is_available():
            self.device = "cuda" 
            print("✅ Using NVIDIA GPU")
        else:
            self.device = "cpu"
            print("⚠️  Using CPU (will be slower)")
            
        self.model.to(self.device)
        
        # Database connection
        self.db_url = os.getenv('DATABASE_URL')
        if not self.db_url:
            raise ValueError("❌ DATABASE_URL environment variable not found!")
            
        print("🗄️  Database connection configured")
        
    def get_artworks_to_process(self, limit: int = 200) -> List[Dict]:
        """Get artworks that need image captioning"""
        print(f"\n🔍 Finding artworks that need captioning (limit: {limit})...")
        
        conn = psycopg2.connect(self.db_url)
        cur = conn.cursor()
        
        try:
            # Select artworks with images but no captions
            cur.execute("""
                SELECT id, object_id, title, primary_image 
                FROM artwork 
                WHERE primary_image IS NOT NULL 
                AND primary_image != '' 
                AND image_caption IS NULL
                ORDER BY RANDOM()
                LIMIT %s
            """, (limit,))
            
            artworks = cur.fetchall()
            
            if not artworks:
                print("✅ No artworks need captioning!")
                return []
                
            print(f"📊 Found {len(artworks)} artworks ready for captioning")
            
            # Convert to list of dicts
            return [
                {
                    'id': row[0],
                    'object_id': row[1], 
                    'title': row[2],
                    'primary_image': row[3]
                }
                for row in artworks
            ]
            
        finally:
            cur.close()
            conn.close()
    
    def caption_single_image(self, image_url: str) -> Optional[str]:
        """Generate caption for a single image"""
        try:
            # Download image with timeout
            response = requests.get(image_url, timeout=15)
            response.raise_for_status()
            
            # Load and convert image
            image = Image.open(BytesIO(response.content)).convert('RGB')
            
            # Process with BLIP2
            inputs = self.processor(image, return_tensors="pt").to(self.device)
            
            with torch.no_grad():
                generated_ids = self.model.generate(
                    **inputs, 
                    max_length=100,
                    num_beams=10,
                    temperature=0.8,
                    repetition_penalty=1.1,
                    do_sample=True
                )
                
            caption = self.processor.decode(generated_ids[0], skip_special_tokens=True)
            
            # Clean up the basic captions - remove common generic starters
            generic_phrases = [
                "there is a picture of",
                "there is a photo of", 
                "there is a drawing of",
                "there is an image of",
                "there is a",
                "this is a picture of",
                "this is a photo of",
                "this is a drawing of", 
                "this is an image of",
                "this is a",
                "an image of",
                "a picture of",
                "a photo of",
                "a drawing of"
            ]
            
            caption_clean = caption
            for phrase in generic_phrases:
                if caption_clean.lower().startswith(phrase):
                    caption_clean = caption_clean[len(phrase):].strip()
            
            # Capitalize first letter if we cleaned something
            if caption_clean and caption_clean != caption:
                caption_clean = caption_clean[0].upper() + caption_clean[1:] if len(caption_clean) > 1 else caption_clean.upper()
            
            return caption_clean.strip()
            
        except requests.exceptions.Timeout:
            print(f"   ⏰ Timeout downloading image")
            return None
        except requests.exceptions.RequestException as e:
            print(f"   🌐 Network error: {str(e)[:50]}...")
            return None
        except Exception as e:
            print(f"   ❌ Error processing image: {str(e)[:50]}...")
            return None
    
    def save_caption_to_db(self, artwork_id: str, caption: str) -> bool:
        """Save caption to database"""
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            
            cur.execute("""
                UPDATE artwork 
                SET image_caption = %s 
                WHERE id = %s
            """, (caption, artwork_id))
            
            conn.commit()
            cur.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"   💾 Database error: {str(e)[:50]}...")
            return False
    
    def process_batch(self, limit: int = 200):
        """Main processing function"""
        print(f"\n🎨 Starting Image Caption Processing")
        print("=" * 50)
        
        # Get artworks to process
        artworks = self.get_artworks_to_process(limit)
        
        if not artworks:
            print("🎉 All artworks already have captions!")
            return
        
        # Processing stats
        stats = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'skipped': 0
        }
        
        print(f"\n📋 Processing {len(artworks)} artworks...")
        print("-" * 50)
        
        for i, artwork in enumerate(artworks, 1):
            stats['processed'] += 1
            
            print(f"\n[{i}/{len(artworks)}] {artwork['title']} (ID: {artwork['object_id']})")
            
            # Generate caption
            caption = self.caption_single_image(artwork['primary_image'])
            
            if caption:
                print(f"   📝 Caption: \"{caption}\"")
                
                # Save to database
                if self.save_caption_to_db(artwork['id'], caption):
                    print(f"   ✅ Saved to database")
                    stats['successful'] += 1
                else:
                    print(f"   ❌ Failed to save to database")
                    stats['failed'] += 1
            else:
                print(f"   ⚠️  Failed to generate caption")
                stats['failed'] += 1
            
            # Progress update every 25 items
            if i % 25 == 0:
                success_rate = (stats['successful'] / stats['processed']) * 100
                print(f"\n📊 Progress: {i}/{len(artworks)} | Success Rate: {success_rate:.1f}%")
            
            # Small delay to be nice to image servers and prevent overheating
            time.sleep(0.5)
        
        # Final results
        print(f"\n🎉 Image Captioning Complete!")
        print("=" * 50)
        print(f"📊 Total processed: {stats['processed']}")
        print(f"✅ Successfully captioned: {stats['successful']}")
        print(f"❌ Failed: {stats['failed']}")
        success_rate = (stats['successful'] / stats['processed']) * 100 if stats['processed'] > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        print(f"\n🚀 Ready for next step: summarization!")


def main():
    """Main entry point"""
    print("🎨 BLIP2 Image Caption Generator")
    print("=" * 50)
    
    try:
        captioner = ImageCaptioner()
        captioner.process_batch(1000)
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Process interrupted by user")
    except Exception as e:
        print(f"\n💥 Fatal error: {e}")
        raise


if __name__ == "__main__":
    main() 