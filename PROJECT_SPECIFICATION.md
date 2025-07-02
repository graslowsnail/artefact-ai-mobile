# 🎨 Artefact AI - Project Specification

## 📋 Project Overview

**Artefact AI** is a full-stack application that revolutionizes artwork discovery by allowing users to search the Metropolitan Museum of Art's collection using natural language queries. The system leverages AI to transform conversational requests into optimized search parameters and provides a beautiful, mobile-first interface for exploring art.

### 🎯 Core Value Proposition
- **Natural Language Search**: Users can search using conversational queries like "cool mexican art" or "van gogh sunflowers"
- **Semantic Vector Search**: Advanced embedding-based search that understands context and meaning beyond keyword matching
- **Enriched Database**: Self-contained database with scraped artwork descriptions and metadata, independent of external APIs
- **Personal Art Vault**: Users can save and manage their favorite artworks
- **Mobile-First Experience**: Built with React Native for cross-platform accessibility

---

## 🏗️ Architecture Overview

### Backend (Express.js + TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM and pgvector extension for semantic search
- **Authentication**: Better Auth with session management
- **AI Integration**: Vercel AI SDK with OpenAI for embeddings and text generation
- **Vector Search**: Semantic similarity search using OpenAI embeddings and PostgreSQL vector operations

### Frontend (Expo React Native)
- **Framework**: Expo with React Native
- **Navigation**: Expo Router (file-based routing)
- **Authentication**: Better Auth Expo client
- **UI/UX**: Modern, beautiful interface with gesture support

### Shared
- **Type Safety**: Shared TypeScript types between frontend and backend
- **API Communication**: RESTful API with type-safe interfaces

---

## 🗄️ Database Schema

### Core Tables

#### `artwork` Table
```sql
CREATE TABLE artwork (
  id TEXT PRIMARY KEY,
  object_id INTEGER NOT NULL UNIQUE,           -- Met Museum object ID
  title TEXT NOT NULL,
  description TEXT,                            -- Rich description and context from HTML scraping
  artist TEXT,
  date TEXT,
  medium TEXT,
  primary_image TEXT,                          -- Main artwork image URL
  primary_image_small TEXT,                    -- Thumbnail image URL
  department TEXT,
  culture TEXT,
  additional_images TEXT,                      -- JSON array of additional image URLs
  object_url TEXT,                            -- Met Museum page URL
  is_highlight BOOLEAN DEFAULT false,
  artist_display_bio TEXT,
  object_begin_date INTEGER,
  object_end_date INTEGER,
  credit_line TEXT,
  classification TEXT,
  artist_nationality TEXT,
  embedding VECTOR(1536),                      -- OpenAI text-embedding-3-large vector for semantic search
  embedding_summary TEXT,                      -- The text used to generate the embedding
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `user` Table
```sql
CREATE TABLE user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `user_favorites` Table (Junction)
```sql
CREATE TABLE user_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES user(id) ON DELETE CASCADE,
  artwork_id TEXT REFERENCES artwork(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Authentication Tables
- `session` - User session management
- `account` - OAuth account linking
- `verification` - Email verification tokens

---

## 🔌 API Endpoints

### Artwork Endpoints

#### `POST /api/artwork/search`
**Description**: Semantic artwork search using vector embeddings and natural language processing

**Request Body**:
```typescript
{
  query: string  // Natural language search query
}
```

**Response**:
```typescript
{
  aiResponse: string,           // AI-generated response about the search
  artworks: MuseumArtwork[],   // Array of matching artworks ranked by semantic similarity
  total: number                // Total matches found
}
```

**Features**:
- Vector similarity search using OpenAI embeddings
- Semantic understanding beyond keyword matching
- Self-contained search using enriched local database
- Fast response times with PostgreSQL vector operations
- AI-generated contextual responses about search results

### Vault (Favorites) Endpoints

#### `POST /api/vault/toggle`
**Description**: Add or remove artwork from user's favorites

#### `GET /api/vault/check/:objectId`
**Description**: Check if artwork is in user's vault

#### `GET /api/vault/my-vault`
**Description**: Get user's saved artworks

### Authentication Endpoints
- `POST /api/auth/sign-in` - User authentication
- `POST /api/auth/sign-out` - User logout
- `GET /api/auth/session` - Current session info

---

## 🤖 AI Integration & Semantic Search

### Semantic Search Pipeline

1. **User Input**: Natural language query (e.g., "show me impressionist paintings with flowers")
2. **Query Embedding**: User query converted to vector using OpenAI text-embedding-3-large
3. **Vector Similarity Search**: PostgreSQL pgvector finds artworks with similar embeddings
4. **Ranking & Filtering**: Results ranked by cosine similarity and filtered for quality
5. **AI Response Generation**: GPT-4 generates contextual response about the search results

### Embedding Generation Strategy

**Content for Embeddings**: Each artwork's embedding is generated from:
```
{title} by {artist}. {description}. Created in {date}. Medium: {medium}. Culture: {culture}. {credit_line}
```

**Embedding Model**: OpenAI `text-embedding-3-large` (1536 dimensions)
- High semantic understanding
- Excellent performance on cultural and artistic content
- Consistent with OpenAI's latest embedding technology

### Vector Search Implementation
- **Storage**: PostgreSQL with pgvector extension
- **Similarity**: Cosine similarity for vector comparison  
- **Performance**: Indexed vector operations for sub-second search
- **Fallback**: Graceful degradation to text search if embeddings unavailable

---

## 🖼️ Data Management System

### Current Implementation
- **Pre-scraped Database**: Complete artwork database with images and rich descriptions
- **Autonomous Operation**: No dependency on external APIs for search operations
- **Rich Metadata**: Enhanced artwork descriptions scraped from Met Museum HTML pages
- **Image Storage**: All artwork images pre-fetched and stored locally

### Data Enrichment Pipeline
1. **Initial Data Import**: Base artwork data imported from Met Museum data dump
2. **HTML Scraping**: Parallel scraping of individual artwork pages for rich descriptions
3. **Image Collection**: Comprehensive image URL collection during scraping phase
4. **Embedding Generation**: Batch generation of semantic embeddings for all artworks
5. **Vector Indexing**: PostgreSQL vector index creation for fast similarity search

### Data Quality Advantages
- **Consistency**: All artworks guaranteed to have images and metadata
- **Performance**: No external API calls during user search operations
- **Reliability**: Independent of Met Museum API availability and rate limits
- **Rich Context**: Enhanced descriptions provide better semantic search results

---

## 📱 Frontend Features

### HomeScreen
- **Search Interface**: Natural language input with real-time feedback
- **Results Grid**: Beautiful 2-column layout of artwork cards
- **Loading States**: Smooth loading animations and progress indicators
- **Error Handling**: User-friendly error messages for API issues

### ArtworkDetailScreen
- **High-Resolution Display**: Full artwork viewing experience
- **Rich Metadata**: Comprehensive artwork information display
- **Vault Integration**: One-tap favorite/unfavorite functionality
- **Navigation**: Smooth transitions and gesture support

### VaultScreen
- **Personal Collection**: User's saved artworks in organized grid
- **Persistent Storage**: Favorites linked to user account
- **Quick Actions**: Easy artwork management and viewing

### UI/UX Design Principles
- **Mobile-First**: Optimized for touch interaction
- **Modern Aesthetics**: Clean, minimalist design with beautiful shadows
- **Accessibility**: Proper contrast ratios and touch targets
- **Performance**: Optimized image loading and smooth animations

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key
- Expo CLI

### Environment Variables

#### Backend (.env)
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/artefact_ai
OPENAI_API_KEY=sk-...
BETTER_AUTH_SECRET=your-secret-key
NODE_ENV=development
PORT=3000
```

#### Frontend
- API base URL configured for local development
- Expo configuration for cross-platform builds

### Scripts

#### Backend
```bash
bun run dev         # Development with auto-reload
bun run build       # TypeScript compilation
bun run start       # Production server
```

#### Frontend
```bash
npm start           # Start Expo dev server
npm run android     # Android emulator
npm run ios         # iOS simulator
npm run web         # Web development
```

---

## 📈 Current Status & Capabilities

### ✅ Implemented Features
- **Full-stack TypeScript architecture**
- **Enriched artwork database with scraped descriptions**
- **Complete image collection for all artworks**
- **User authentication and sessions**
- **Personal artwork vault/favorites**
- **Mobile-responsive UI with Expo**
- **HTML scraping pipeline for rich metadata**
- **Error handling and loading states**
- **Beautiful, modern interface design**
- **Independent operation without external API dependencies**

### 🚧 In Progress: Semantic Search Implementation
- **Vector Embeddings**: Generate embeddings for all artwork descriptions
- **PostgreSQL pgvector Setup**: Configure vector extension and indexing
- **Semantic Search API**: Replace keyword search with vector similarity
- **AI Response Generation**: Contextual responses about search results
- **Performance Optimization**: Vector search query optimization

### 🔮 Future Enhancements
- **Multi-modal Embeddings**: Image + text combined embeddings
- **Search Analytics**: User query analytics and optimization
- **Personalized Recommendations**: User preference learning
- **Social Features**: Artwork sharing and collections

### 📊 Technical Metrics
- **Database**: Supports millions of artwork records
- **Search Performance**: Sub-second response times
- **API Rate Limits**: Graceful handling with retry logic
- **Mobile Performance**: 60fps animations and smooth scrolling
- **Type Safety**: 100% TypeScript coverage across stack

---

## 🔮 Future Roadmap

### Phase 1: Semantic Search Foundation (Current)
- Complete semantic vector search implementation
- PostgreSQL pgvector optimization and indexing
- Embedding generation pipeline for all artworks
- Performance benchmarking and optimization

### Phase 2: Advanced AI Features
- Multi-modal embeddings combining text and visual features
- Personalized recommendations based on user search history
- AI-powered artwork analysis and insights
- Advanced filtering with semantic understanding

### Phase 3: Enhanced Discovery
- Visual similarity search using computer vision
- Contextual artwork recommendations
- Search history and saved searches
- Smart collections based on semantic clustering

### Phase 4: Platform & Community
- User-generated collections and galleries
- Artwork sharing and social features
- Educational content integration
- API for third-party developers
- Mobile offline functionality

---

## 🛠️ Technical Dependencies

### Backend Core
```json
{
  "@ai-sdk/openai": "^1.3.22",
  "ai": "^4.3.16",
  "better-auth": "^1.2.12",
  "drizzle-orm": "^0.44.2",
  "express": "^4.21.1",
  "postgres": "^3.4.7",
  "pgvector": "^0.2.0"
}
```

### Database Extensions
- **pgvector**: PostgreSQL extension for vector similarity search
- **Vector Indexing**: HNSW and IVFFlat indexes for performance optimization

### Frontend Core
```json
{
  "expo": "~53.0.13",
  "react": "19.0.0",
  "react-native": "0.79.4",
  "expo-router": "~5.1.1",
  "@better-auth/expo": "^1.2.12"
}
```

### Development Tools
- **TypeScript**: Full type safety across stack
- **Drizzle Kit**: Database migrations and schema management
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting

---

## 📝 Notes for Future Development

### Code Quality Standards
- All new features must include TypeScript types
- API endpoints require error handling and validation
- Frontend components need loading and error states
- Database queries should use Drizzle ORM methods

### Performance Considerations
- Image lazy loading and optimization
- Database query optimization with proper indexing
- API response caching strategies
- Mobile bundle size optimization

### Security Requirements
- Input validation on all user data
- SQL injection prevention via ORM
- Rate limiting on API endpoints
- Secure session management

---

*Last Updated: Jul 2 2025*  
*Version: 1.0.0*  
*Maintainers: Development Team* 

graph LR
    A[Artwork Image] --> B[GPT-4 Vision]
    B --> C[Image Description]
    D[Database Metadata] --> E[JSON Structure]
    C --> F[LLM Synthesis]
    E --> F
    F --> G[1-3 Sentence Summary]
    G --> H[OpenAI Embeddings]
    H --> I[Vector Storage] 