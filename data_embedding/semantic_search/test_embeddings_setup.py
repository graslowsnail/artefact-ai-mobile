#!/usr/bin/env python3
"""
🧪 Test OpenAI Embeddings Setup
Verifies configuration before running full embedding generation
"""

import openai
import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables from backend
load_dotenv('../../backend/.env')

def test_environment_variables():
    """Test that required environment variables are set"""
    print("🔍 Testing environment variables...")
    
    openai_key = os.getenv('OPENAI_API_KEY')
    db_url = os.getenv('DATABASE_URL')
    
    if not openai_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return False
    
    if not db_url:
        print("❌ DATABASE_URL not found in environment")
        return False
    
    print("✅ Environment variables configured")
    print(f"🔑 OpenAI API Key: {'*' * (len(openai_key) - 8)}{openai_key[-8:]}")
    return True

def test_openai_connection():
    """Test OpenAI API connection"""
    print("\n🤖 Testing OpenAI connection...")
    
    try:
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        response = client.embeddings.create(
            model="text-embedding-3-large",
            input="Test embedding",
            dimensions=1536
        )
        
        if response.data and len(response.data) > 0:
            embedding_length = len(response.data[0].embedding)
            print(f"✅ OpenAI connection successful")
            print(f"📐 Test embedding dimensions: {embedding_length}")
            return True
        else:
            print("❌ No embedding data received")
            return False
            
    except Exception as e:
        print(f"❌ OpenAI connection failed: {str(e)}")
        return False

def test_database_connection():
    """Test database connection and check for target records"""
    print("\n🗄️  Testing database connection...")
    
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cur = conn.cursor()
        
        # Test basic connection
        cur.execute("SELECT version();")
        version = cur.fetchone()
        print(f"✅ Database connection successful")
        
        # Check for artworks needing embeddings
        cur.execute("""
            SELECT COUNT(*) FROM artwork 
            WHERE embedding_summary IS NOT NULL 
            AND embedding_summary != '' 
            AND embedding IS NULL
        """)
        
        count = cur.fetchone()[0]
        print(f"📊 Found {count} artworks ready for embedding")
        
        # Check existing embeddings
        cur.execute("""
            SELECT COUNT(*) FROM artwork 
            WHERE embedding IS NOT NULL
        """)
        
        existing_count = cur.fetchone()[0]
        print(f"📊 Existing embeddings: {existing_count}")
        
        cur.close()
        conn.close()
        
        return count > 0
        
    except Exception as e:
        print(f"❌ Database connection failed: {str(e)}")
        return False

def test_pgvector_extension():
    """Test if pgvector extension is available"""
    print("\n🔌 Testing pgvector extension...")
    
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cur = conn.cursor()
        
        # Check if vector type exists
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_type WHERE typname = 'vector'
            );
        """)
        
        has_vector = cur.fetchone()[0]
        
        if has_vector:
            print("✅ pgvector extension is available")
            
            # Check vector column in artwork table
            cur.execute("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'artwork' 
                AND column_name = 'embedding'
            """)
            
            result = cur.fetchone()
            if result:
                print(f"✅ Embedding column exists: {result[1]}")
            else:
                print("❌ Embedding column not found in artwork table")
                return False
                
        else:
            print("❌ pgvector extension not found")
            return False
        
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ pgvector test failed: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("🧪 OpenAI Embeddings Setup Test")
    print("=" * 40)
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("OpenAI Connection", test_openai_connection),
        ("Database Connection", test_database_connection),
        ("pgvector Extension", test_pgvector_extension)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 40)
    print("📋 TEST SUMMARY")
    print("=" * 40)
    
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 40)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("🚀 Ready to run: python generate_embeddings.py")
    else:
        print("⚠️  SOME TESTS FAILED")
        print("🔧 Fix the issues above before running embedding generation")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 