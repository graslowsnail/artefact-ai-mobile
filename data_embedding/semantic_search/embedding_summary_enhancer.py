#!/usr/bin/env python3
"""
🎨 Embedding Summary Enhancer using Ollama Llama3
Combines BLIP2 captions with artwork metadata to create rich summaries
"""

import requests
import json
import psycopg2
import os
import time
from typing import List, Dict, Optional
from dotenv import load_dotenv

# Load environment variables from backend
load_dotenv('../../backend/.env')

class EmbeddingSummaryEnhancer:
    def __init__(self):
        print("🎨 Initializing Embedding Summary Enhancer...")
        
        # Ollama configuration  
        self.ollama_url = "http://localhost:11434/api/generate"
        self.model_name = "llama3-beast"  # BEAST MODE ACTIVATED
        
        # Database connection
        self.db_url = os.getenv('DATABASE_URL')
        if not self.db_url:
            raise ValueError("❌ DATABASE_URL environment variable not found!")
            
        print("🗄️  Database connection configured")
        self._test_ollama_connection()
        
    def _test_ollama_connection(self):
        """Test if Ollama is running and model is available"""
        try:
            response = requests.post(
                self.ollama_url,
                json={
                    "model": self.model_name,
                    "prompt": "Hello",
                    "stream": False
                },
                timeout=30
            )
            
            if response.status_code == 200:
                print("✅ Ollama connection successful")
                print(f"🦙 Using model: {self.model_name}")
            else:
                raise Exception(f"Ollama returned status {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            raise Exception("❌ Cannot connect to Ollama. Make sure 'ollama serve' is running!")
        except requests.exceptions.Timeout:
            raise Exception("❌ Ollama connection timeout. Is the service running?")
    
    def get_artworks_to_enhance(self, limit: int = 200) -> List[Dict]:
        """Get artworks that need embedding summaries"""
        print(f"\n🔍 Finding artworks that need embedding summaries (limit: {limit})...")
        
        conn = psycopg2.connect(self.db_url)
        cur = conn.cursor()
        
        try:
            # Select artworks with captions but no embedding summaries
            cur.execute("""
                SELECT id, object_id, title, artist, date, medium, culture, 
                      description, image_caption, department, credit_line
                FROM artwork 
                WHERE image_caption IS NOT NULL 
                AND image_caption != '' 
                AND embedding_summary IS NULL
                ORDER BY object_id
                LIMIT %s
            """, (limit,))
            
            artworks = cur.fetchall()
            
            if not artworks:
                print("✅ No artworks need embedding summaries!")
                return []
                
            print(f"📊 Found {len(artworks)} artworks ready for enhancement")
            
            # Convert to list of dicts
            return [
                {
                    'id': row[0],
                    'object_id': row[1],
                    'title': row[2] or "Untitled",
                    'artist': row[3] or "Unknown Artist",
                    'date': row[4] or "Unknown Date",
                    'medium': row[5] or "Unknown Medium",
                    'culture': row[6] or "Unknown Culture",
                    'description': row[7] or "",
                    'image_caption': row[8] or "",
                    'department': row[9] or "Unknown Department",
                    'credit_line': row[10] or ""
                }
                for row in artworks
            ]
            
        finally:
            cur.close()
            conn.close()
    
    def create_enhancement_prompt(self, artwork: Dict) -> str:
        """Create a smart prompt for Llama3 to enhance the caption"""
        
        # Build context from available metadata
        context_parts = []
        
        # Always include the visual description from BLIP
        context_parts.append(f"Visual description: {artwork['image_caption']}")
        
        # Add meaningful metadata
        if artwork['title'] and artwork['title'] != "Untitled":
            context_parts.append(f"Title: {artwork['title']}")
        
        if artwork['artist'] and artwork['artist'] != "Unknown Artist":
            context_parts.append(f"Artist: {artwork['artist']}")
        
        if artwork['date'] and artwork['date'] != "Unknown Date":
            context_parts.append(f"Date: {artwork['date']}")
        
        if artwork['medium'] and artwork['medium'] != "Unknown Medium":
            context_parts.append(f"Medium: {artwork['medium']}")
        
        if artwork['culture'] and artwork['culture'] != "Unknown Culture":
            context_parts.append(f"Culture: {artwork['culture']}")
        
        if artwork['department'] and artwork['department'] != "Unknown Department":
            context_parts.append(f"Department: {artwork['department']}")
        
        # Add description if available and substantial
        if artwork['description'] and len(artwork['description']) > 20:
            # Truncate very long descriptions
            desc = artwork['description'][:300] + "..." if len(artwork['description']) > 300 else artwork['description']
            context_parts.append(f"Additional context: {desc}")
        
        context = "\n".join(context_parts)
        
        prompt = f"""You are a renowned art historian and museum curator with expertise in visual analysis and cultural context. Create a sophisticated, detailed 2-3 sentence summary that transforms the basic visual description into a rich, contextual artwork description.

Artwork Information:
{context}

Instructions:
- Write exactly 2-3 sentences
- Elevate the visual description with art historical terminology and cultural significance
- Include specific details about style, technique, period characteristics, or cultural meaning
- Mention materials, artistic movement, or historical context when relevant
- Use sophisticated but accessible museum-quality language
- Transform generic descriptions into compelling, informative summaries
- Focus on what makes this piece unique or representative of its time/culture

Create a museum-quality description:"""

        return prompt
    
    def enhance_with_llama3(self, prompt: str) -> Optional[str]:
        """Send prompt to Llama3 and get enhanced summary"""
        try:
            response = requests.post(
                self.ollama_url,
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "num_predict": 150,      # Slightly shorter for speed
                        "num_batch": 2048,       # BIGGER batches = more CPU utilization
                        "num_thread": -1,        # USE ALL AVAILABLE CORES (-1 = auto-detect)
                        "num_gpu": 0             #  Force CPU-only (frees up unified memory)
                    }
                },
                timeout=20  # BEAST MODE - faster timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                summary = result.get('response', '').strip()
                
                # Clean up the response
                if summary:
                    # Remove any "Summary:" prefix that might be included
                    if summary.lower().startswith('summary:'):
                        summary = summary[8:].strip()
                    
                    return summary
                else:
                    return None
            else:
                print(f"   ❌ Ollama error: {response.status_code}")
                return None
                
        except requests.exceptions.Timeout:
            print(f"   ⏰ Ollama timeout")
            return None
        except Exception as e:
            print(f"   ❌ Ollama error: {str(e)[:50]}...")
            return None
    
    def save_summary_to_db(self, artwork_id: str, summary: str) -> bool:
        """Save enhanced summary to database"""
        try:
            conn = psycopg2.connect(self.db_url)
            cur = conn.cursor()
            
            cur.execute("""
                UPDATE artwork 
                SET embedding_summary = %s 
                WHERE id = %s
            """, (summary, artwork_id))
            
            conn.commit()
            cur.close()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"   💾 Database error: {str(e)[:50]}...")
            return False
    
    def process_batch(self, limit: int = 200):
        """Main processing function"""
        print(f"\n🎨 Starting Embedding Summary Enhancement")
        print("=" * 60)
        
        # Get artworks to process
        artworks = self.get_artworks_to_enhance(limit)
        
        if not artworks:
            print("🎉 All artworks already have embedding summaries!")
            return
        
        # Processing stats
        stats = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'skipped': 0
        }
        
        print(f"\n📋 Processing {len(artworks)} artworks...")
        print("-" * 60)
        
        for i, artwork in enumerate(artworks, 1):
            stats['processed'] += 1
            
            print(f"\n[{i}/{len(artworks)}] {artwork['title']} by {artwork['artist']} (ID: {artwork['object_id']})")
            print(f"   🖼️  BLIP Caption: \"{artwork['image_caption']}\"")
            
            # Create enhancement prompt
            prompt = self.create_enhancement_prompt(artwork)
            
            # Get enhanced summary from Llama3
            enhanced_summary = self.enhance_with_llama3(prompt)
            
            if enhanced_summary:
                print(f"   ✨ Enhanced: \"{enhanced_summary}\"")
                
                # Save to database
                if self.save_summary_to_db(artwork['id'], enhanced_summary):
                    print(f"   ✅ Saved to database")
                    stats['successful'] += 1
                else:
                    print(f"   ❌ Failed to save to database")
                    stats['failed'] += 1
            else:
                print(f"   ⚠️  Failed to generate enhanced summary")
                stats['failed'] += 1
            
            # Progress update every 25 items
            if i % 25 == 0:
                success_rate = (stats['successful'] / stats['processed']) * 100
                print(f"\n📊 Progress: {i}/{len(artworks)} | Success Rate: {success_rate:.1f}%")
            
            # BEAST MODE - NO DELAYS!
            # time.sleep(0.1)  # DISABLED FOR MAXIMUM SPEED
        
        # Final results
        print(f"\n🎉 Embedding Summary Enhancement Complete!")
        print("=" * 60)
        print(f"📊 Total processed: {stats['processed']}")
        print(f"✅ Successfully enhanced: {stats['successful']}")
        print(f"❌ Failed: {stats['failed']}")
        success_rate = (stats['successful'] / stats['processed']) * 100 if stats['processed'] > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        print(f"\n🚀 Ready for next step: OpenAI embeddings!")


def main():
    """Main entry point"""
    print("🎨 Embedding Summary Enhancer with Ollama Llama3")
    print("=" * 60)
    
    try:
        enhancer = EmbeddingSummaryEnhancer()
        enhancer.process_batch(200)
        
    except KeyboardInterrupt:
        print("\n\n⏹️  Process interrupted by user")
    except Exception as e:
        print(f"\n💥 Fatal error: {e}")
        raise


if __name__ == "__main__":
    main() 