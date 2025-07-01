import { Router } from 'express';
import { z } from 'zod';
import { toggleFavorite, isFavorited, getUserFavorites } from '../controllers/vaultController.js';

const router = Router();

// Middleware to extract user ID from Better Auth session
const requireAuth = async (req: any, res: any, next: any) => {
  try {
    // Get session token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const userId = req.headers['x-user-id'];

    // Check if we have both token and user ID
    if (!token || !userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'Both session token and user ID must be provided'
      });
    }

    // TODO: In production, validate the token with Better Auth
    // For now, we trust the token + user ID combination from our frontend
    
    req.userId = userId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Invalid session' });
  }
};

// Toggle favorite (add/remove)
router.post('/toggle', requireAuth, async (req, res) => {
  try {
    const toggleSchema = z.object({
      objectId: z.number().int().positive(),
    });

    const { objectId } = toggleSchema.parse(req.body);
    const userId = (req as any).userId;

    const result = await toggleFavorite(userId, objectId);
    
    res.json({
      success: true,
      isFavorited: result.isFavorited,
      message: result.isFavorited ? 'Added to vault' : 'Removed from vault'
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors
      });
    }

    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to toggle favorite' 
    });
  }
});

// Check if artwork is favorited
router.get('/check/:objectId', requireAuth, async (req, res) => {
  try {
    const objectId = parseInt(req.params.objectId);
    if (isNaN(objectId)) {
      return res.status(400).json({ error: 'Invalid object ID' });
    }

    const userId = (req as any).userId;
    const favorited = await isFavorited(userId, objectId);
    
    res.json({ isFavorited: favorited });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to check favorite status' 
    });
  }
});

// Get all user favorites (their vault)
router.get('/my-vault', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const favorites = await getUserFavorites(userId);
    
    res.json({
      success: true,
      vault: favorites,
      count: favorites.length
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to get vault' 
    });
  }
});

export default router; 