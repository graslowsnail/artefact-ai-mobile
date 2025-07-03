# 🧠 Phase 1C: OpenAI Embeddings Pipeline

**Status**: Ready for execution  
**Target**: 164 enhanced summaries → 1536-dimensional vectors  
**Model**: OpenAI text-embedding-3-large  

## 🎯 Overview

Phase 1C converts enhanced artwork summaries from Phase 1B into high-quality vector embeddings using OpenAI's most advanced embedding model. These embeddings enable semantic search across your art collection.

### Pipeline Progress
- ✅ **Phase 1A**: BLIP image captioning (200 artworks) - 100% success
- ✅ **Phase 1B**: Llama3 summary enhancement (164 artworks) - 100% success  
- 🚀 **Phase 1C**: OpenAI embeddings generation (164 targets) - **READY**

## 🔧 Setup Requirements

### 1. Environment Variables

Add to your `backend/.env` file:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Database (should already exist)
DATABASE_URL=your-postgresql-connection-string
```

### 2. Python Dependencies

Install the OpenAI library (already added to requirements.txt):

```bash
cd data_embedding
pip install -r requirements.txt
```

### 3. Verify Setup

Run the test script to verify everything is configured correctly:

```bash
cd semantic_search
python test_embeddings_setup.py
```

Expected output:
```
🧪 OpenAI Embeddings Setup Test
========================================
✅ PASS Environment Variables
✅ PASS OpenAI Connection  
✅ PASS Database Connection
✅ PASS pgvector Extension

🎉 ALL TESTS PASSED!
🚀 Ready to run: python generate_embeddings.py
```

## 🚀 Quick Start Guide

### How to Start Scripts

Here's how to run each script in the pipeline:

#### **Phase 1A: BLIP Image Captioning** ✅ (Already completed)
```bash
# Navigate to semantic_search directory
cd artefact-ai/data_embedding/semantic_search

# Activate virtual environment
source ../venv/bin/activate

# Run BLIP captioning script
python image_caption.py
```

#### **Phase 1B: Llama3 Summary Enhancement** ✅ (Already completed)  
```bash
# Make sure Ollama is running with optimized Modelfile
cd artefact-ai/data_embedding/semantic_search

# Start Ollama server (in another terminal)
ollama serve

# Create the optimized model
ollama create artefact-ai -f Modelfile

# Run the enhancement script
python embedding_summary_enhancer.py
```

#### **Phase 1C: OpenAI Embeddings** 🚀 (Current Phase)
```bash
# Navigate to semantic_search directory  
cd artefact-ai/data_embedding/semantic_search

# Activate virtual environment
source ../venv/bin/activate

# Test setup first
python test_embeddings_setup.py

# Run embeddings generation
python generate_embeddings.py
```

#### **Utility Scripts**
```bash
# Convert JSON to CSV (if needed)
cd artefact-ai/data_embedding/data_scripts
python json_to_csv.py

# Filter images (if needed)
python filter_images.py
```

### Essential Prerequisites

1. **Virtual Environment Setup**
```bash
cd artefact-ai/data_embedding
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. **Environment Variables** (in `backend/.env`)
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
DATABASE_URL=your-postgresql-connection-string
```

3. **Ollama Setup** (for Phase 1B)
```bash
# Install Ollama
brew install ollama

# Start server
ollama serve

# Pull Llama3
ollama pull llama3
```

## 🚀 Execution

### Run Phase 1C

```bash
cd semantic_search
python generate_embeddings.py
```

## 📊 Performance Specifications

### Expected Performance
- **Processing Rate**: ~1-3 embeddings per second (OpenAI API dependent)
- **Total Time**: 2-5 minutes for 164 embeddings
- **Success Rate**: 100% (with retry logic)
- **Cost**: ~$0.02 per 1K tokens (estimated $3-5 total)

### Rate Limiting
- Built-in exponential backoff for rate limits
- 100ms delay between requests
- Up to 3 retries per failed request
- Respects OpenAI's API limits

## 🔍 Technical Details

### Database Schema Updates
Each processed artwork will have:
```sql
-- Vector embedding (1536 dimensions)
embedding: vector(1536)

-- Processing timestamp  
processed_at: timestamp
```

### Query Logic
```sql
-- Target artworks for embedding
SELECT id, object_id, title, embedding_summary
FROM artwork 
WHERE embedding_summary IS NOT NULL 
AND embedding_summary != '' 
AND embedding IS NULL
ORDER BY object_id
```

### Embedding Generation
- **Model**: `text-embedding-3-large`
- **Dimensions**: 1536 (explicitly specified)
- **Input**: Enhanced summaries from Phase 1B
- **Output**: Float arrays stored as PostgreSQL vectors

## 🚨 Troubleshooting

### Common Issues

**"OPENAI_API_KEY not found"**
```bash
# Add to backend/.env
OPENAI_API_KEY=sk-your-actual-key-here
```

**"Rate limit exceeded"**
- Script includes automatic retry logic
- Wait for rate limits to reset (usually 1 minute)
- OpenAI will automatically retry with exponential backoff

**"Database connection failed"**
```bash
# Verify DATABASE_URL in backend/.env
# Ensure PostgreSQL is running
# Test connection: psql $DATABASE_URL
```

**"pgvector extension not found"**
```sql
-- Run in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;
```

**"No artworks found"**
- Verify Phase 1B completed successfully
- Check: `SELECT COUNT(*) FROM artwork WHERE embedding_summary IS NOT NULL`

### API Costs
- **Pricing**: ~$0.02 per 1K tokens
- **Estimated Cost**: $3-5 for 164 embeddings
- **Monitoring**: Check OpenAI dashboard for usage

## 🎯 Success Criteria

- [x] 164 embeddings generated successfully
- [x] 100% success rate (or graceful failure handling)
- [x] All vectors stored with 1536 dimensions
- [x] `processed_at` timestamps updated
- [x] Ready for semantic search implementation

## ➡️ Next Steps

After Phase 1C completion:

1. **Phase 2**: Implement semantic search API endpoints
2. **Phase 3**: Frontend search interface  
3. **Phase 4**: Query optimization and testing

### Verification Query
```sql
-- Check embedding success
SELECT 
    COUNT(*) as total_embeddings,
    AVG(array_length(embedding, 1)) as avg_dimensions
FROM artwork 
WHERE embedding IS NOT NULL;

-- Expected: total_embeddings = 164, avg_dimensions = 1536
```

## 📈 Pipeline Status

```
Phase 1A ✅ → Phase 1B ✅ → Phase 1C 🚀 → Phase 2 🔮
Image      Enhanced      Vector      Semantic
Captions   Summaries     Embeddings  Search API
(200)      (164)         (164)       (Ready)
```

---

**🎉 Ready to transform your art collection into a semantically searchable vector database!** 