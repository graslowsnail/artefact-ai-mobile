# 🛠️ Scripts Directory

This directory contains utility scripts for the Artefact AI backend.

## 🖼️ Fetch Missing Images Script

The `fetch-missing-images.ts` script fetches primary image URLs for all artworks in the database that currently have null or empty `primary_image` values. This is essential for preparing the database for semantic embedding processing.

### 🚀 Quick Start

```bash
# Test run (see what would be done without making changes)
bun run fetch-images:test

# Dry run on all artworks
bun run fetch-images:dry

# Actually fetch and update images
bun run fetch-images
```

### 📖 Detailed Usage

```bash
# Run the script directly with tsx
tsx scripts/fetch-missing-images.ts [OPTIONS]

# Or use the npm scripts
bun run fetch-images              # Fetch all missing images
bun run fetch-images:dry          # Dry run mode
bun run fetch-images:test         # Test with 10 artworks, verbose
```

### ⚙️ Command Line Options

| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be done without updating the database |
| `--verbose`, `-v` | Enable detailed logging for each artwork |
| `--limit N` | Only process the first N artworks (useful for testing) |
| `--help`, `-h` | Show help message |

### 📊 Example Output

```
🎨 Artefact AI - Missing Images Fetcher
=====================================

🔍 Searching for artworks missing images...
   Found 1,247 artworks needing images

📊 Found 1,247 artworks missing images
⚙️  Configuration:
   - Concurrency: 5
   - Request delay: 200ms
   - Max retries: 3
   - Batch size: 100

📊 Progress: 50/1,247 (4.0%) | ✅ 42 | ❌ 3 | ⚠️ 5 | ⚡ 2.1/s | ⏱️ ETA: 9m 31s
...

🎉 Image Fetching Complete!
===========================
📊 Total processed: 1,247
✅ Successfully updated: 1,156
❌ Failed: 12
⚠️  Skipped (no image): 79
⏱️  Total time: 8m 43s
⚡ Average rate: 2.4 artworks/second

✨ Ready for semantic embedding processing!
```

### 🔧 Configuration

The script includes built-in configuration that respects Met API rate limits:

- **Concurrency**: 5 simultaneous requests
- **Request Delay**: 200ms between batches
- **Max Retries**: 3 attempts per failed request
- **Exponential Backoff**: Increasing delays for retries

### 🎯 Use Cases

1. **Initial Setup**: After importing artwork data without images
2. **Maintenance**: Periodic updates to fill missing images
3. **Semantic Search Prep**: Ensure all artworks have images for embedding
4. **Data Quality**: Identify artworks that don't have images available

### ⚠️ Important Notes

- The script only processes artworks that already exist in your database
- It fetches both `primary_image` and `primary_image_small` URLs
- Failed object IDs are reported for manual investigation
- The Met API may not have images for all artworks
- Use `--dry-run` first to see what will be processed

### 🐛 Troubleshooting

**Script fails to connect to database:**
- Check your `DATABASE_URL` environment variable
- Ensure PostgreSQL is running

**High failure rate:**
- Met API may be experiencing issues
- Try running with `--verbose` to see specific errors
- Consider increasing `REQUEST_DELAY` for rate limiting issues

**Memory issues with large datasets:**
- The script processes artworks in batches
- Consider using `--limit` for very large datasets

### 📈 Performance

- Average processing rate: ~2-3 artworks per second
- Memory usage: Low (processes in batches)
- Network usage: Moderate (respects API rate limits)
- Database impact: Minimal (efficient updates)

---

*This script prepares your artwork database for semantic embedding by ensuring all artworks have associated images, improving search quality beyond Met's native fuzzy search capabilities.* 