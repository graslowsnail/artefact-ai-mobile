#!/usr/bin/env python3
"""
🧠 Phase 1C: OpenAI Embeddings Generator
Converts enhanced artwork summaries into vector embeddings for semantic search
"""

import openai
import psycopg2
import os
import time
import json
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from dotenv import load_dotenv

# Load environment variables from backend
load_dotenv('../../backend/.env')

class OpenAIEmbeddingsGenerator:
    def __init__(self):
        print("🧠 Initializing OpenAI Embeddings Generator...")
        print("=" * 50)
        
        # OpenAI configuration
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            raise ValueError("❌ OPENAI_API_KEY environment variable not found!")
        
        # Initialize OpenAI client
        self.client = openai.OpenAI(api_key=self.openai_api_key)
        self.model_name = "text-embedding-3-large"
        self.embedding_dimensions = 3072  # Upgraded to 3072 for better performance
        
        # Database connection
        self.db_url = os.getenv('DATABASE_URL')
        if not self.db_url:
            raise ValueError("❌ DATABASE_URL environment variable not found!")
        
        print("✅ OpenAI client initialized")
        print(f"🤖 Model: {self.model_name}")
        print(f"📐 Dimensions: {self.embedding_dimensions}")
        print("🗄️  Database connection configured")
        
        # Rate limiting configuration
        self.max_retries = 3
        self.base_delay = 1.0  # Base delay between requests
        self.max_delay = 30.0  # Maximum delay for exponential backoff
        
        # Test OpenAI connection
        self._test_openai_connection()
    
    def _test_openai_connection(self):
        """Test OpenAI API connection with a simple embedding request"""
        try:
            print("\n🔍 Testing OpenAI connection...")
            
            response = self.client.embeddings.create(
                model=self.model_name,
                input="Test connection",
                dimensions=self.embedding_dimensions
            )
            
            if response.data and len(response.data) > 0:
                embedding_length = len(response.data[0].embedding)
                print(f"✅ OpenAI connection successful")
                print(f"📊 Test embedding length: {embedding_length} dimensions")
                
                if embedding_length != self.embedding_dimensions:
                    raise ValueError(f"❌ Expected {self.embedding_dimensions} dimensions, got {embedding_length}")
            else:
                raise Exception("❌ No embedding data received from OpenAI")
                
        except Exception as e:
            raise Exception(f"❌ OpenAI connection failed: {str(e)}")
    
    def get_artworks_needing_embeddings(self, limit: int = None) -> List[Dict]:
        """Get artworks with embedding_summary but no embedding"""
        print(f"\n🔍 Finding artworks that need embeddings...")
        
        conn = psycopg2.connect(self.db_url)
        cur = conn.cursor()
        
        try:
            # Build query with optional limit
            query = """
                SELECT id, object_id, title, embedding_summary
                FROM artwork 
                WHERE embedding_summary IS NOT NULL 
                AND embedding_summary != '' 
                AND embedding IS NULL
                ORDER BY object_id
            """
            
            if limit:
                query += " LIMIT %s"
                cur.execute(query, (limit,))
            else:
                cur.execute(query)
            
            artworks = cur.fetchall()
            
            if not artworks:
                print("✅ No artworks need embeddings!")
                return []
            
            print(f"📊 Found {len(artworks)} artworks ready for embedding")
            
            # Convert to list of dicts
            return [
                {
                    'id': row[0],
                    'object_id': row[1],
                    'title': row[2] or "Untitled",
                    'embedding_summary': row[3]
                }
                for row in artworks
            ]
            
        finally:
            cur.close()
            conn.close()
    
    def generate_embedding(self, text: str, retries: int = 0) -> Optional[List[float]]:
        """Generate embedding from text using OpenAI API with retry logic"""
        try:
            response = self.client.embeddings.create(
                model=self.model_name,
                input=text,
                dimensions=self.embedding_dimensions
            )
            
            if response.data and len(response.data) > 0:
                embedding = response.data[0].embedding
                
                # Validate embedding dimensions
                if len(embedding) != self.embedding_dimensions:
                    raise ValueError(f"Expected {self.embedding_dimensions} dimensions, got {len(embedding)}")
                
                return embedding
            else:
                raise Exception("No embedding data received")
                
        except openai.RateLimitError as e:
            if retries < self.max_retries:
                # Exponential backoff for rate limits
                wait_time = min(self.base_delay * (2 ** retries), self.max_delay)
                print(f"   ⏰ Rate limited, waiting {wait_time:.1f}s (attempt {retries + 1}/{self.max_retries})")
                time.sleep(wait_time)
                return self.generate_embedding(text, retries + 1)
            else:
                print(f"   ❌ Rate limit exceeded after {self.max_retries} retries")
                return None
                
        except openai.APIError as e:
            if retries < self.max_retries:
                wait_time = self.base_delay * (retries + 1)
                print(f"   🔄 API error, retrying in {wait_time:.1f}s (attempt {retries + 1}/{self.max_retries})")
                time.sleep(wait_time)
                return self.generate_embedding(text, retries + 1)
            else:
                print(f"   ❌ API error after {self.max_retries} retries: {str(e)}")
                return None
                
        except Exception as e:
            print(f"   ❌ Unexpected error: {str(e)}")
            return None
    
    def save_embedding_to_db(self, artwork_id: str, embedding: List[float]) -> bool:
        """Save embedding vector to database with processed_at timestamp"""
        conn = psycopg2.connect(self.db_url)
        cur = conn.cursor()
        
        try:
            # Convert embedding to PostgreSQL array format
            embedding_array = '[' + ','.join(map(str, embedding)) + ']'
            
            cur.execute("""
                UPDATE artwork 
                SET embedding = %s::vector, processed_at = %s
                WHERE id = %s
            """, (embedding_array, datetime.now(), artwork_id))
            
            conn.commit()
            return True
            
        except Exception as e:
            print(f"   ❌ Database error: {str(e)}")
            conn.rollback()
            return False
            
        finally:
            cur.close()
            conn.close()
    
    def process_embeddings(self, limit: int = None) -> Tuple[int, int, int]:
        """Process all artworks needing embeddings"""
        print("\n🚀 Starting OpenAI Embeddings Generation")
        print("=" * 50)
        
        # Get artworks to process
        artworks = self.get_artworks_needing_embeddings(limit)
        
        if not artworks:
            return 0, 0, 0
        
        total_artworks = len(artworks)
        processed = 0
        succeeded = 0
        failed = 0
        
        print(f"\n📝 Processing {total_artworks} artworks...")
        print(f"🎯 Target: {self.embedding_dimensions}-dimensional vectors")
        print(f"🤖 Model: {self.model_name}")
        start_time = time.time()
        
        for i, artwork in enumerate(artworks, 1):
            print(f"\n[{i:3d}/{total_artworks}] Processing: {artwork['title'][:50]}...")
            print(f"   📄 Object ID: {artwork['object_id']}")
            
            # Generate embedding
            embedding = self.generate_embedding(artwork['embedding_summary'])
            
            if embedding:
                # Save to database
                if self.save_embedding_to_db(artwork['id'], embedding):
                    print(f"   ✅ Embedding saved ({len(embedding)} dimensions)")
                    succeeded += 1
                else:
                    print(f"   ❌ Failed to save embedding")
                    failed += 1
            else:
                print(f"   ❌ Failed to generate embedding")
                failed += 1
            
            processed += 1
            
            # Progress update every 10 items
            if i % 10 == 0 or i == total_artworks:
                elapsed = time.time() - start_time
                rate = processed / elapsed if elapsed > 0 else 0
                eta = (total_artworks - processed) / rate if rate > 0 else 0
                
                print(f"\n📊 Progress: {processed}/{total_artworks} ({processed/total_artworks*100:.1f}%)")
                print(f"✅ Succeeded: {succeeded} | ❌ Failed: {failed}")
                print(f"⚡ Rate: {rate:.1f} embeddings/sec | ⏱️  ETA: {eta/60:.1f} min")
            
            # Small delay to be respectful to API
            if i < total_artworks:  # Don't delay after the last item
                time.sleep(0.1)  # 100ms delay between requests
        
        # Final results
        elapsed = time.time() - start_time
        print(f"\n🎉 EMBEDDING GENERATION COMPLETE!")
        print("=" * 50)
        print(f"📊 Total processed: {processed}")
        print(f"✅ Successful: {succeeded}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success rate: {succeeded/processed*100:.1f}%")
        print(f"⏱️  Total time: {elapsed/60:.1f} minutes")
        print(f"⚡ Average rate: {processed/elapsed:.1f} embeddings/sec")
        
        return processed, succeeded, failed

def main():
    """Main execution function"""
    try:
        generator = OpenAIEmbeddingsGenerator()
        
        # Process all artworks (up to 164 based on spec)
        processed, succeeded, failed = generator.process_embeddings()
        
        if succeeded > 0:
            print(f"\n🎯 SUCCESS: Generated {succeeded} embeddings!")
            print("🔍 Vector database is now ready for semantic search")
            print("➡️  Next: Phase 2 - Implement semantic search API endpoints")
        else:
            print(f"\n⚠️  WARNING: No embeddings were generated successfully")
        
        # Exit with appropriate code
        if failed == 0:
            print("\n✨ Phase 1C completed with 100% success rate!")
            exit(0)
        elif succeeded > 0:
            print(f"\n⚠️  Phase 1C completed with {failed} failures")
            exit(1)
        else:
            print("\n❌ Phase 1C failed - no embeddings generated")
            exit(2)
            
    except KeyboardInterrupt:
        print("\n⚠️  Process interrupted by user")
        exit(130)
    except Exception as e:
        print(f"\n💥 Fatal error: {str(e)}")
        exit(1)

if __name__ == "__main__":
    main() 