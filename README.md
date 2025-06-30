# 🚀 Artefact AI - Monorepo

A full-stack application with Express TypeScript backend and Expo React Native frontend.

## 📁 Project Structure

```
artefact-ai/
├── backend/           # Express TypeScript API
│   ├── src/
│   │   └── index.ts   # Main server file
│   ├── package.json
│   └── tsconfig.json
├── frontend/          # Expo React Native App
│   ├── app/           # File-based routing
│   ├── components/    # Reusable components
│   ├── assets/        # Images, fonts, etc.
│   └── package.json
└── README.md          # This file
```

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Bun](https://bun.sh/) (recommended) or npm
- [Expo CLI](https://expo.dev/)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
bun install

# Start development server
bun run dev

# Or with npm
npm install
npm run dev
```

The backend will start at `http://localhost:3000`

**Available Endpoints:**
- `GET /` - Welcome message
- `GET /health` - Health check with server metrics
- `GET /api/test` - Test endpoint with mock data

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

**Development Options:**
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web
- Scan QR code with Expo Go app

## 🔥 Features

### Backend
- ✅ TypeScript for type safety
- ✅ Express.js with CORS enabled
- ✅ Beautiful API logging with colors
- ✅ Request tracking and metrics
- ✅ Health check endpoint
- ✅ Graceful shutdown handling
- ✅ Auto-reload with nodemon

### Frontend
- ✅ Expo Router (file-based routing)
- ✅ TypeScript support
- ✅ Dark/Light theme support
- ✅ Modern React Native components
- ✅ Cross-platform (iOS, Android, Web)

## 🔗 API Integration

The frontend is configured to work with the backend API. Update the API base URL in your frontend code:

```typescript
const API_BASE_URL = 'http://localhost:3000';
```

## 📦 Scripts

### Backend Scripts
```bash
bun run dev        # Start development server with auto-reload
bun run build      # Compile TypeScript to JavaScript
bun run start      # Start production server
```

### Frontend Scripts
```bash
npm start          # Start Expo development server
npm run reset-project  # Reset to clean app structure
```

## 🚀 Deployment

### Backend
- Build: `bun run build`
- Start: `bun run start`
- Deploy to services like Railway, Heroku, or Vercel

### Frontend
- Build for production: `npx expo build`
- Deploy with EAS Build for app stores
- Web deployment: `npx expo export:web`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

---

**Made with ❤️ using TypeScript, Express, and Expo** 