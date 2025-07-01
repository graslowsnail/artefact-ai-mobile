# 🎨 Artefact AI - Project Specification

## 📋 Project Overview

**Artefact AI** is a full-stack application that revolutionizes artwork discovery by allowing users to search the Metropolitan Museum of Art's collection using natural language queries. The system leverages AI to transform conversational requests into optimized search parameters and provides a beautiful, mobile-first interface for exploring art.

### 🎯 Core Value Proposition
- **Natural Language Search**: Users can search using conversational queries like "cool mexican art" or "van gogh sunflowers"
- **AI-Powered Query Enhancement**: GPT-4 transforms user queries into optimized Met Museum API search terms
- **Semantic Search Ready**: Prepared for semantic embedding integration to improve search beyond Met's native fuzzy search
- **Personal Art Vault**: Users can save and manage their favorite artworks
- **Mobile-First Experience**: Built with React Native for cross-platform accessibility

---

## 🏗️ Architecture Overview

### Backend (Express.js + TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth with session management
- **AI Integration**: Vercel AI SDK with OpenAI GPT-4
- **External API**: Metropolitan Museum of Art Collection API

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
**Description**: Intelligent artwork search with natural language processing

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
  artworks: MuseumArtwork[],   // Array of matching artworks
  total: number                // Total matches found
}
```

**Features**:
- AI query enhancement via GPT-4
- Automatic image fetching for artworks missing images
- Smart filtering to return only artworks with images
- Rate limiting and error handling for Met API

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

## 🤖 AI Integration

### Query Processing Pipeline

1. **User Input**: Natural language query (e.g., "show me impressionist paintings")
2. **AI Enhancement**: GPT-4 processes query using custom system prompt
3. **Keyword Extraction**: AI extracts optimal search terms
4. **Cultural Context**: AI adds relevant art-specific terms for broad cultural queries
5. **Met API Search**: Optimized query sent to Metropolitan Museum API

### System Prompt Strategy
- Removes filler words and articles
- Preserves culturally significant terms
- Enriches vague queries with art-specific keywords
- Optimizes for Met Museum's search algorithm

**Example Transformations**:
- "I want to see something mexican" → "mexican art mural folk"
- "Japanese samurai armor from Edo period" → "samurai armor japan edo"
- "Van Gogh sunflowers" → "van gogh sunflower"

---

## 🖼️ Image Management System

### Current Implementation
- **Search-Time Fetching**: Images fetched during search operations for missing artworks
- **Database Storage**: Image URLs stored in `primary_image` and `primary_image_small` fields
- **Fallback Handling**: Graceful handling of missing images with placeholder UI

### Image Data Flow
1. **Met API Search**: Returns object IDs with `hasImages=true` filter
2. **Database Check**: Verify which objects exist locally and need images
3. **Bulk Image Fetch**: Parallel requests to Met object API for missing images
4. **Database Update**: Store fetched image URLs
5. **Response Filtering**: Return only artworks with valid images

### Known Challenges
- **Met API Limitations**: Fuzzy search quality issues
- **Image Availability**: Not all artworks have high-quality images
- **Rate Limiting**: Need to handle Met API rate limits gracefully

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
- **AI-powered natural language search**
- **Met Museum API integration**
- **User authentication and sessions**
- **Personal artwork vault/favorites**
- **Mobile-responsive UI with Expo**
- **Automatic image fetching during search**
- **Error handling and loading states**
- **Beautiful, modern interface design**

### 🚧 Areas for Enhancement
- **Semantic Search**: Ready for vector embedding integration
- **Bulk Image Processing**: Standalone script for missing images (in development)
- **Performance Optimization**: Image caching and CDN integration
- **Search Analytics**: User query analytics and optimization
- **Social Features**: Artwork sharing and collections

### 📊 Technical Metrics
- **Database**: Supports millions of artwork records
- **Search Performance**: Sub-second response times
- **API Rate Limits**: Graceful handling with retry logic
- **Mobile Performance**: 60fps animations and smooth scrolling
- **Type Safety**: 100% TypeScript coverage across stack

---

## 🔮 Future Roadmap

### Phase 1: Performance & Scale
- Implement semantic vector search with embeddings
- Add Redis caching layer
- Optimize database queries with indexing
- Implement CDN for image delivery

### Phase 2: Enhanced Discovery
- Personalized recommendations based on user behavior
- Visual similarity search using computer vision
- Advanced filtering (date ranges, mediums, cultures)
- Search history and saved searches

### Phase 3: Social & Community
- User-generated collections and galleries
- Artwork sharing and social features
- Collaborative curation tools
- Educational content integration

### Phase 4: Platform Expansion
- Additional museum API integrations
- Augmented reality artwork viewing
- Offline functionality for mobile
- API for third-party developers

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
  "postgres": "^3.4.7"
}
```

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

*Last Updated: December 2024*  
*Version: 1.0.0*  
*Maintainers: Development Team* 