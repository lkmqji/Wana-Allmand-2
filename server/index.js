const { initDiagnostics } = require('./utils/diagnostics');
initDiagnostics();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { parsePdf } = require('./utils/pdfParser');
const gameManager = require('./game/GameManager');
const mongoose = require('mongoose');
const List = require('./models/List');
const User = require('./models/User');
const Config = require('./models/Config');
const Notification = require('./models/Notification');
const { formatPlayerName } = require('./utils/formatters');
const { exampleLists } = require('./utils/exampleLists');
const dns = require('dns');
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (e) { /* ignore */ }
require('dotenv').config();
const { GoogleGenAI, Type } = require('@google/genai');

let genAIClient = null;
function getGenAI() {
    if (!genAIClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY is missing from environment variables.');
        genAIClient = new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
    }
    return genAIClient;
}

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
      console.log('Connected to MongoDB');
      try {
          const config = await Config.findOne({ key: 'app_config' });
          if (config && config.forceMatchingPairs !== undefined) {
              gameManager.forceMatchingPairs = config.forceMatchingPairs;
          }
      } catch (err) {
          console.error('Error loading config on startup:', err);
      }
  })
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow all for MVP
        methods: ["GET", "POST"]
    },
    pingInterval: 25000,
    pingTimeout: 20000
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// ---- ADMIN MIDDLEWARE ----
const verifyAdmin = (req, res, next) => {
    const adminUid = req.headers['x-admin-uid'] || req.body?.adminUid || req.query?.adminUid;
    if (!process.env.ADMIN_UID || adminUid !== process.env.ADMIN_UID) {
        return res.status(403).json({ error: 'Accès refusé. Administrateur requis.' });
    }
    next();
};

// ---- HEALTH CHECK / KEEP-ALIVE ENDPOINTS (Render Ping) ----
app.get(['/', '/health', '/api/health'], (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        message: 'Server is awake and healthy',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// ---- PUBLIC CONFIG ENDPOINT ----
app.get('/api/config', async (req, res) => {
    try {
        let config = await Config.findOne({ key: 'app_config' });
        if (!config) config = await Config.create({ key: 'app_config' });
        res.json({ 
            guestMode: config.guestMode ?? true,
            maintenanceMode: config.maintenanceMode ?? false,
            requirePwaInstall: config.requirePwaInstall ?? false,
            forceMatchingPairs: config.forceMatchingPairs ?? false,
            announcement: config.announcement || ''
        });
    } catch (err) {
        res.status(500).json({ error: 'Config error' });
    }
});

// ---- ADMIN STATS / OVERVIEW ----
app.get('/api/admin/overview', verifyAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalLists = await List.countDocuments();
        const publicLists = await List.countDocuments({ isPublic: true });
        const privateLists = totalLists - publicLists;
        
        // Sum total games played & xp via MongoDB Aggregation (no memory leak)
        const statsAggregation = await User.aggregate([
            { $group: { _id: null, totalXp: { $sum: '$xp' }, totalGames: { $sum: '$gamesPlayed' } } }
        ]);
        const totalGamesPlayed = statsAggregation[0]?.totalGames || 0;
        const totalXp = statsAggregation[0]?.totalXp || 0;
        const activeRooms = gameManager.sessions?.size || 0;

        res.json({
            totalUsers,
            totalLists,
            publicLists,
            privateLists,
            totalGamesPlayed,
            totalXp,
            activeRooms
        });
    } catch (err) {
        console.error("Admin overview error:", err);
        res.status(500).json({ error: "Erreur lors de la récupération des stats." });
    }
});

// ---- ADMIN USERS MANAGEMENT ----
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;
        const users = await User.find().sort({ xp: -1 }).skip(skip).limit(limit).lean();
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs." });
    }
});

app.put('/api/admin/users/:firebaseId', verifyAdmin, async (req, res) => {
    try {
        const { name, xp, level, gamesPlayed, gamesWon } = req.body;
        const updated = await User.findOneAndUpdate(
            { firebaseId: req.params.firebaseId },
            { $set: { name, xp, level, gamesPlayed, gamesWon } },
            { new: true }
        );
        if (!updated) return res.status(404).json({ error: "Utilisateur non trouvé" });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: "Erreur mise à jour utilisateur" });
    }
});

// ---- ADMIN ALL LISTS MANAGEMENT ----
app.get('/api/admin/lists', verifyAdmin, async (req, res) => {
    try {
        const lists = await List.find().sort({ createdAt: -1 }).lean();
        const userIds = [...new Set(lists.map(l => l.userId))];
        const users = await User.find({ firebaseId: { $in: userIds } });
        const userMap = {};
        users.forEach(u => userMap[u.firebaseId] = u.name);

        const enriched = lists.map(l => ({
            ...l,
            creatorName: userMap[l.userId] || 'Inconnu'
        }));
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: "Erreur lors de la récupération des listes" });
    }
});

// ---- ADMIN CONFIG ENDPOINT ----
app.post('/api/admin/config', verifyAdmin, async (req, res) => {
    const { setting, value } = req.body;
    try {
        let config = await Config.findOne({ key: 'app_config' });
        if (!config) config = await Config.create({ key: 'app_config' });
        config[setting] = value;
        config.updatedAt = new Date();
        await config.save();

        if (setting === 'announcement') {
            io.emit('admin_announcement', value);
        }

        if (setting === 'forceMatchingPairs') {
            gameManager.forceMatchingPairs = value;
        }

        // Broadcast real-time config updates (e.g., requirePwaInstall, guestMode, maintenanceMode)
        io.emit('config_updated', {
            guestMode: config.guestMode ?? true,
            maintenanceMode: config.maintenanceMode ?? false,
            requirePwaInstall: config.requirePwaInstall ?? false,
            forceMatchingPairs: config.forceMatchingPairs ?? false,
            announcement: config.announcement || '',
            [setting]: value
        });

        res.json({ success: true, [setting]: value });
    } catch (err) {
        res.status(500).json({ error: 'Config update error' });
    }
});

// ---- NOTIFICATIONS ENDPOINTS ----

// Get notifications for a user
app.get('/api/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        let notifs = [];
        
        if (userId && userId !== 'guest') {
            const [allNotifs, userNotifs] = await Promise.all([
                Notification.find({ userId: 'ALL' }).sort({ createdAt: -1 }).limit(25).lean(),
                Notification.find({ userId: userId }).sort({ createdAt: -1 }).limit(25).lean()
            ]);
            notifs = [...allNotifs, ...userNotifs];
            notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            notifs = notifs.slice(0, 50);
        } else {
            notifs = await Notification.find({ userId: 'ALL' }).sort({ createdAt: -1 }).limit(50).lean();
        }

        const enriched = notifs.map(n => ({
            ...n,
            isRead: userId && userId !== 'guest' ? (n.readBy || []).includes(userId) : false
        }));
        res.json(enriched);
    } catch (err) {
        console.error("Error fetching notifications:", err);
        res.status(500).json({ error: "Erreur récupération notifications" });
    }
});

// Mark single notification as read
app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "userId requis" });
        await Notification.findByIdAndUpdate(req.params.id, {
            $addToSet: { readBy: userId }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Erreur marquage lecture" });
    }
});

// Mark all notifications as read for a user
app.put('/api/notifications/read-all', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: "userId requis" });
        await Notification.updateMany(
            { $or: [{ userId: 'ALL' }, { userId: userId }] },
            { $addToSet: { readBy: userId } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Erreur marquage tout lu" });
    }
});

// Delete single notification
app.delete('/api/notifications/:id', async (req, res) => {
    try {
        await Notification.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Erreur suppression notification" });
    }
});

// Admin sends notification (ALL or specific users)
app.post('/api/admin/notifications', verifyAdmin, async (req, res) => {
    try {
        const { title, message, type = 'info', icon = '📢', targetType = 'all', targetUserIds = [] } = req.body;
        if (!title?.trim() || !message?.trim()) {
            return res.status(400).json({ error: "Le titre et le message sont requis." });
        }

        const createdNotifs = [];

        if (targetType === 'all') {
            const notif = await Notification.create({
                userId: 'ALL',
                title: title.trim(),
                message: message.trim(),
                type,
                icon
            });
            createdNotifs.push(notif);
            // Broadcast live to all connected sockets
            io.emit('new_notification', notif);
        } else if (targetType === 'specific' && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
            for (const tUserId of targetUserIds) {
                const notif = await Notification.create({
                    userId: tUserId,
                    title: title.trim(),
                    message: message.trim(),
                    type,
                    icon
                });
                createdNotifs.push(notif);
                // Send to specific user room
                io.to(`user_${tUserId}`).emit('new_notification', notif);
            }
        } else {
            return res.status(400).json({ error: "Veuillez sélectionner au moins un utilisateur cible." });
        }

        res.json({ success: true, count: createdNotifs.length, notifications: createdNotifs });
    } catch (err) {
        console.error("Admin notification error:", err);
        res.status(500).json({ error: "Erreur lors de l'envoi de la notification." });
    }
});

// Endpoint for PDF upload
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }
        
        const vocabList = await parsePdf(req.file.buffer);
        res.json({ vocabList });
    } catch (error) {
        console.error('Error parsing PDF:', error);
        res.status(500).json({ error: 'Failed to parse PDF.' });
    }
});

// Endpoint for AI text/file extraction (Advanced version)
app.post('/api/extract', upload.single('file'), async (req, res) => {
    console.log("--- Extract Route Reached ---");
    console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
    console.log("req.body.text:", !!req.body.text, "req.file:", !!req.file);
    try {
        const text = req.body.text || req.body.rawText || "";
        const file = req.file;
        let options = {};
        try {
            if (req.body.options) {
                options = typeof req.body.options === 'string' ? JSON.parse(req.body.options) : req.body.options;
            }
        } catch (e) { console.warn("Failed to parse options"); }

        if (!text.trim() && !file) {
            return res.status(400).json({ error: "Aucun contenu fourni." });
        }

        if (process.env.GEMINI_API_KEY) {
            try {
                const ai = getGenAI();
                const parts = [];

                if (text.startsWith("THEME:")) {
                    const theme = text.replace("THEME:", "").trim();
                    const prompt = `Tu es un assistant linguistique. Génère une liste de 15 mots essentiels ou pertinents (niveau A2/B1) sur le thème suivant : "${theme}". Renvoie STRICTEMENT un tableau JSON au format exact: [{"question": "mot français", "english": "english translation", "answer": "mot allemand avec article der/die/das"}] sans texte additionnel.`;
                    parts.push({ text: prompt });
                } else {
                    const sourceLang = options.sourceLang || 'Français / English / العربية';
                    const targetLang = options.targetLang || 'Allemand';
                    const excludeProperNouns = options.excludeProperNouns !== false;
                    const excludeLocations = options.excludeLocations !== false;
                    const excludeBasicGrammar = options.excludeBasicGrammar !== false;
                    const includeArticles = options.includeArticles !== false;
                    const includePlurals = options.includePlurals !== false;

                    const systemInstruction = `Tu es un expert linguiste et professeur de langues polyglotte spécialisé dans l'apprentissage de l'allemand.
Ta tâche est d'analyser le contenu fourni et d'en extraire le vocabulaire structuré :

DANS LA PREMIÈRE COLONNE (frenchText):
Pour CHAQUE mot ou expression extrait, tu DOIS fournir sa traduction ou le mot source (Français/Anglais/Arabe). S'il y a plusieurs mots, sépare par |.

DANS LA DEUXIÈME COLONNE (germanText):
- Pour chaque NOM : ${includeArticles ? "Ajoute l'article défini (der, die, das)." : "Fournis sans article."} ${includePlurals ? "Indique la terminaison du pluriel." : ""}
- Pour chaque VERBE : Mets-le à l'INFINITIF.
- Pour chaque ADJECTIF/ADVERBE/EXPRESSION : Traduction naturelle.

RÈGLES DE FILTRAGE :
- ${excludeProperNouns ? 'EXCLUS STRICTEMENT les prénoms et noms de personnes.' : ''}
- ${excludeLocations ? 'EXCLUS STRICTEMENT les noms de villes et pays.' : ''}
- ${excludeBasicGrammar ? 'EXCLUS les mots de grammaire trop basiques.' : ''}

Classifie dans : NOMS, VERBES, ADJECTIFS_ADVERBES, EXPRESSIONS.`;

                    const promptText = `Analyse ce contenu et extrais le vocabulaire dans la 1ère colonne (Français/Anglais/Arabe) et la 2ème colonne (${targetLang}) en suivant rigoureusement les consignes.`;

                    if (file) {
                        parts.push({
                            inlineData: {
                                mimeType: file.mimetype,
                                data: file.buffer.toString('base64')
                            }
                        });
                        parts.push({ text: promptText });
                    } else if (text) {
                        parts.push({ text: `Voici le texte à analyser :\n\n${text}\n\n${promptText}` });
                    }

                    const response = await ai.models.generateContent({
                        model: 'gemini-1.5-flash',
                        contents: { parts },
                        config: {
                            systemInstruction,
                            responseMimeType: 'application/json',
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    detectedLanguage: { type: Type.STRING },
                                    notes: { type: Type.STRING },
                                    vocabulary: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                category: { type: Type.STRING },
                                                frenchText: { type: Type.STRING },
                                                englishText: { type: Type.STRING },
                                                arabicText: { type: Type.STRING },
                                                germanText: { type: Type.STRING }
                                            },
                                            required: ['category', 'germanText']
                                        }
                                    }
                                },
                                required: ['vocabulary']
                            }
                        }
                    });

                    const parsed = JSON.parse(response.text || '{}');
                    const rawVocab = Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [];
                    
                    const vocabList = rawVocab.map((item, idx) => {
                        const q = [item.frenchText, item.englishText, item.arabicText].filter(Boolean).join(' | ');
                        return {
                            id: Date.now() + idx,
                            question: q || '???',
                            english: item.englishText || "",
                            answer: item.germanText || '???',
                            category: item.category || 'EXPRESSIONS'
                        };
                    }).filter(w => w.question !== '???' && w.answer !== '???');

                    console.log("Generated vocabList length:", vocabList.length);

                    if (vocabList.length > 0) {
                        return res.json({ 
                            vocabList, 
                            detectedInfo: {
                                detectedLanguage: parsed.detectedLanguage,
                                notes: parsed.notes
                            }
                        });
                    }
                    console.warn("vocabList was empty, falling through to text parser...");
                }
            } catch (aiErr) {
                console.error("Gemini API call error:", aiErr);
                // Fallback to legacy structure if the new one fails (e.g., using gemini-1.5-flash for THEME)
                if (text.startsWith("THEME:")) {
                   try {
                       const theme = text.replace("THEME:", "").trim();
                       const prompt = `Génère 15 mots sur le thème "${theme}". JSON: [{"question": "français", "english": "anglais", "answer": "allemand avec article"}]`;
                       const fallbackResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ contents: [{ parts: [{text: prompt}] }] })
                       });
                       const fallbackData = await fallbackResponse.json();
                       let rawText = fallbackData.candidates[0].content.parts[0].text.trim();
                       if (rawText.startsWith('```json')) rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
                       if (rawText.startsWith('```')) rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
                       const parsed = JSON.parse(rawText);
                       const vocabList = parsed.map((item, idx) => ({ id: idx+1, question: item.question, answer: item.answer }));
                       return res.json({ vocabList });
                   } catch(fallbackErr) {
                       console.error("Fallback error", fallbackErr);
                   }
                }
            }
        }

        // Fallback rule-based line parser (only works for text)
        if (!text || text.startsWith("THEME:")) {
             return res.status(500).json({ error: "L'IA est requise pour extraire le vocabulaire depuis un fichier média ou un thème." });
        }
        const lines = text.split('\n').filter(l => l.includes('=') || l.includes('-') || l.includes(':'));
        const vocabList = lines.map((line, idx) => {
            const sep = line.includes('=') ? '=' : line.includes('-') ? '-' : ':';
            const parts = line.split(sep);
            return {
                id: idx + 1,
                question: parts[0]?.trim() || '',
                answer: parts[1]?.trim() || ''
            };
        }).filter(w => w.question && w.answer);

        res.json({ vocabList });
    } catch (err) {
        console.error("Extract route error:", err);
        res.status(500).json({ error: "Erreur lors de l'extraction." });
    }
});

// Endpoint to save a list
app.post('/api/lists', async (req, res) => {
    try {
        const { userId, name, words } = req.body;
        if (!userId || !name || !words) return res.status(400).json({ error: 'Missing fields' });
        
        const newList = new List({ userId, name, words });
        await newList.save();
        res.json(newList);
    } catch (error) {
        console.error('Error saving list:', error);
        res.status(500).json({ error: 'Failed to save list.' });
    }
});

// Endpoint to get all public lists
app.get('/api/lists/public', async (req, res) => {
    try {
        const publicLists = await List.find({ isPublic: true }).sort({ createdAt: -1 }).limit(50).lean();
        
        const firebaseIds = publicLists.map(l => l.userId);
        const users = await User.find({ firebaseId: { $in: firebaseIds } });
        const userMap = {};
        const photoMap = {};
        const avatarMap = {};
        users.forEach(u => {
            userMap[u.firebaseId] = u.name;
            photoMap[u.firebaseId] = u.photoURL || null;
            avatarMap[u.firebaseId] = u.avatar || '🦊';
        });
        
        const listsWithCreator = publicLists.map(l => ({
            ...l,
            creatorName: userMap[l.userId] || 'Membre',
            creatorPhoto: photoMap[l.userId] || null,
            creatorAvatar: avatarMap[l.userId] || '🦊'
        }));

        res.json(listsWithCreator);
    } catch (err) {
        console.error('Error fetching public lists:', err);
        res.status(500).json({ error: 'Failed to fetch public lists' });
    }
});

// Endpoint to get lists for a user
app.get('/api/lists/:userId', async (req, res) => {
    try {
        const lists = await List.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(lists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to update a list
app.put('/api/lists/:id', async (req, res) => {
    try {
        const { name, words } = req.body;
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (words !== undefined) updateData.words = words;
        const updatedList = await List.findByIdAndUpdate(
            req.params.id, 
            updateData,
            { new: true }
        );
        if (!updatedList) return res.status(404).json({ error: 'List not found' });
        res.json(updatedList);
    } catch (error) {
        console.error('Error updating list:', error);
        res.status(500).json({ error: 'Failed to update list.' });
    }
});

// Endpoint to toggle public status of a list
app.put('/api/lists/:id/public', async (req, res) => {
    try {
        const { isPublic } = req.body;
        const updatedList = await List.findByIdAndUpdate(
            req.params.id, 
            { isPublic },
            { new: true }
        );
        if (!updatedList) return res.status(404).json({ error: 'List not found' });
        res.json(updatedList);
    } catch (error) {
        console.error('Error updating public status:', error);
        res.status(500).json({ error: 'Failed to update public status.' });
    }
});

// Endpoint to delete a list
app.delete('/api/lists/:id', async (req, res) => {
    try {
        const deletedList = await List.findByIdAndDelete(req.params.id);
        if (!deletedList) return res.status(404).json({ error: 'List not found' });
        res.json({ message: 'List deleted successfully' });
    } catch (error) {
        console.error('Error deleting list:', error);
        res.status(500).json({ error: 'Failed to delete list.' });
    }
});

// Endpoint to delete a user and all their lists
app.delete('/api/users/:firebaseId', async (req, res) => {
    try {
        const { firebaseId } = req.params;
        // Delete all lists belonging to the user
        await List.deleteMany({ userId: firebaseId });
        // Delete the user from DB
        await User.findOneAndDelete({ firebaseId });
        res.json({ message: 'User and associated data deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
});

async function enrichUserFailedWords(user) {
    if (!user || !Array.isArray(user.failedWords) || user.failedWords.length === 0) return user;
    let modified = false;
    const missing = user.failedWords.some(fw => !fw.question || fw.question.toLowerCase().includes('traduire'));
    if (missing) {
        try {
            const lists = await List.find({}, 'words');
            const map = new Map();
            lists.forEach(l => {
                (l.words || []).forEach(w => {
                    if (w.answer && w.question) {
                        map.set(w.answer.trim().toLowerCase(), w.question.trim());
                    }
                });
            });
            user.failedWords.forEach(fw => {
                if (!fw.question || fw.question.toLowerCase().includes('traduire')) {
                    const found = map.get((fw.word || '').trim().toLowerCase());
                    if (found) {
                        fw.question = found;
                        modified = true;
                    }
                }
            });
            if (modified) {
                await user.save();
            }
        } catch (e) {
            console.error("Error enriching failed words:", e);
        }
    }
    return user;
}

app.post('/api/users/sync', async (req, res) => {
    try {
        const { firebaseId, name, avatar, photoURL } = req.body;
        let user = await User.findOne({ firebaseId });
        if (!user) {
            user = await User.create({ 
                firebaseId, 
                name: name ? formatPlayerName(name) : 'Joueur',
                avatar: avatar || '🦊',
                photoURL: photoURL || null
            });
        } else {
            // Keep existing custom user name if already set, or update if provided and user has no custom name
            if (name && (!user.name || user.name === 'Joueur')) {
                user.name = formatPlayerName(name);
            }
            if (avatar && !user.avatar) {
                user.avatar = avatar;
            }
            if (photoURL && !user.photoURL) {
                user.photoURL = photoURL;
            }
            await user.save();
        }
        await enrichUserFailedWords(user);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to update user profile (name and/or avatar)
app.put('/api/users/:firebaseId/profile', async (req, res) => {
    try {
        const { firebaseId } = req.params;
        const { name, avatar } = req.body;
        let user = await User.findOne({ firebaseId });
        if (!user) {
            user = await User.create({ 
                firebaseId, 
                name: name ? formatPlayerName(name) : 'Joueur',
                avatar: avatar || '🦊'
            });
        } else {
            if (name && typeof name === 'string' && name.trim()) {
                user.name = formatPlayerName(name.trim());
            }
            if (avatar && typeof avatar === 'string') {
                user.avatar = avatar;
            }
            await user.save();
        }

        // Update in-memory online users if connected
        for (const [sId, onlineUser] of onlineUsers.entries()) {
            if (onlineUser.firebaseId === firebaseId) {
                onlineUser.name = `${user.avatar || '🦊'} ${formatPlayerName(user.name)}`;
                onlineUser.avatar = user.avatar || '🦊';
            }
        }
        broadcastOnlineUsers();

        res.json({ success: true, user });
    } catch (err) {
        console.error('Error updating user profile:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to fetch single user stats & failedWords
app.get('/api/users/:firebaseId', async (req, res) => {
    try {
        let user = await User.findOne({ firebaseId: req.params.firebaseId });
        if (!user) return res.status(404).json({ error: 'User not found' });
        await enrichUserFailedWords(user);
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TASK 4: Backend API of Purification
app.put('/api/users/:firebaseId/purify', async (req, res) => {
    try {
        const { firebaseId } = req.params;
        const { word } = req.body;
        if (!word) {
            return res.status(400).json({ error: 'Word is required' });
        }

        let user = await User.findOne({ firebaseId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Pull word from failedWords
        user.failedWords = (user.failedWords || []).filter(w => w.word !== word);
        // +50 XP bonus
        user.xp = (user.xp || 0) + 50;
        // Level up check
        user.level = Math.floor(user.xp / 1000) + 1;

        await user.save();
        res.json({
            success: true,
            xp: user.xp,
            level: user.level,
            failedWords: user.failedWords,
            user
        });
    } catch (err) {
        console.error('Error purifying word:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to delete a specific word from user's failedWords (manual deletion)
app.delete('/api/users/:firebaseId/failed-words', async (req, res) => {
    try {
        const { firebaseId } = req.params;
        const { word } = req.body;
        if (!word) {
            return res.status(400).json({ error: 'Word is required' });
        }

        let user = await User.findOne({ firebaseId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const normalizedTarget = word.trim().toLowerCase();
        user.failedWords = (user.failedWords || []).filter(w => {
            const wName = typeof w === 'string' ? w : (w.word || '');
            return wName.trim().toLowerCase() !== normalizedTarget;
        });

        await user.save();
        res.json({
            success: true,
            failedWords: user.failedWords,
            user
        });
    } catch (err) {
        console.error('Error deleting failed word:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to clear all failed words for a user
app.delete('/api/users/:firebaseId/failed-words/clear', async (req, res) => {
    try {
        const { firebaseId } = req.params;
        let user = await User.findOne({ firebaseId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.failedWords = [];
        await user.save();
        res.json({ success: true, failedWords: [] });
    } catch (err) {
        console.error('Error clearing failed words:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to edit a failed word (word + question)
app.put('/api/users/:firebaseId/failed-words/edit', async (req, res) => {
    try {
        const { firebaseId } = req.params;
        const { oldWord, newWord, newQuestion } = req.body;
        if (!oldWord || !newWord) {
            return res.status(400).json({ error: 'oldWord and newWord are required' });
        }

        let user = await User.findOne({ firebaseId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const oldNorm = oldWord.trim().toLowerCase();
        user.failedWords = (user.failedWords || []).map(w => {
            const wWord = typeof w === 'string' ? w : (w?.word || '');
            if (wWord.trim().toLowerCase() === oldNorm) {
                return {
                    word: newWord.trim(),
                    question: newQuestion ? newQuestion.trim() : (w.question || newWord.trim()),
                    count: typeof w === 'object' && w.count ? w.count : 1
                };
            }
            return w;
        });

        await user.save();
        res.json({ success: true, failedWords: user.failedWords, user });
    } catch (err) {
        console.error('Error updating failed word:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const topUsers = await User.find().sort({ xp: -1 }).limit(10);
        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to record daily XP history and streak
function recordUserDailyXpAndStreak(dbUser, gainedXp = 0) {
    if (!dbUser) return;
    const today = new Date().toISOString().split('T')[0];
    dbUser.lastSeen = new Date();

    // Streak Calculation
    if (dbUser.lastActiveDay) {
        const lastDate = new Date(dbUser.lastActiveDay);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            dbUser.streak = (dbUser.streak || 0) + 1;
        } else if (diffDays > 1) {
            dbUser.streak = 1;
        }
    } else {
        dbUser.streak = 1;
    }
    dbUser.lastActiveDay = today;

    // Daily XP Array: Ensure at least last 7 days exist with valid data
    if (!Array.isArray(dbUser.dailyXp)) {
        dbUser.dailyXp = [];
    }
    let todayEntry = dbUser.dailyXp.find(d => d.date === today);
    if (todayEntry) {
        todayEntry.xp += gainedXp;
    } else {
        dbUser.dailyXp.push({ date: today, xp: gainedXp });
    }
    if (dbUser.dailyXp.length > 7) {
        dbUser.dailyXp = dbUser.dailyXp.slice(-7);
    }
}

// Endpoint to fetch rich public profile for floating modal (by mongo _id or firebaseId)
app.get('/api/users/profile/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        const currentFirebaseId = req.query.currentFirebaseId || null;

        let user = null;
        if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
            user = await User.findById(identifier);
        }
        if (!user) {
            user = await User.findOne({ firebaseId: identifier });
        }
        if (!user) {
            // Also search by name if needed
            user = await User.findOne({ name: decodeURIComponent(identifier) });
        }

        if (!user) {
            return res.status(404).json({ error: 'Joueur introuvable' });
        }

        // Generate 7-day history for the chart if empty
        const now = new Date();
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const existing = (user.dailyXp || []).find(x => x.date === dateStr);
            last7Days.push({
                date: dateStr,
                dayName: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()],
                xp: existing ? existing.xp : (i === 0 ? (user.xp % 80 || 20) : Math.max(0, Math.floor((user.xp / (i + 4)) % 120)))
            });
        }

        const followersCount = (user.followers || []).length;
        const followingCount = (user.following || []).length;
        const friendsCount = (user.friends || []).length;

        const isFollowing = currentFirebaseId ? (user.followers || []).includes(currentFirebaseId) : false;
        const isFriend = currentFirebaseId ? (user.friends || []).includes(currentFirebaseId) : false;

        const winRate = user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0;

        res.json({
            _id: user._id,
            firebaseId: user.firebaseId,
            name: user.name,
            avatar: user.avatar || '🦊',
            photoURL: user.photoURL || null,
            xp: user.xp || 0,
            level: user.level || 1,
            gamesPlayed: user.gamesPlayed || 0,
            gamesWon: user.gamesWon || 0,
            winRate,
            lastSeen: user.lastSeen || user.updatedAt || new Date(),
            streak: user.streak || 1,
            dailyXpHistory: last7Days,
            followersCount,
            followingCount,
            friendsCount,
            isFollowing,
            isFriend
        });
    } catch (err) {
        console.error('Error fetching player profile:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to follow/unfollow a player
app.post('/api/users/:targetFirebaseId/follow', async (req, res) => {
    try {
        const { targetFirebaseId } = req.params;
        const { currentFirebaseId } = req.body;
        if (!currentFirebaseId || currentFirebaseId === targetFirebaseId) {
            return res.status(400).json({ error: 'Action invalide' });
        }

        const targetUser = await User.findOne({ firebaseId: targetFirebaseId });
        const currentUser = await User.findOne({ firebaseId: currentFirebaseId });
        if (!targetUser || !currentUser) {
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }

        if (!Array.isArray(targetUser.followers)) targetUser.followers = [];
        if (!Array.isArray(currentUser.following)) currentUser.following = [];

        const isAlreadyFollowing = targetUser.followers.includes(currentFirebaseId);
        if (isAlreadyFollowing) {
            targetUser.followers = targetUser.followers.filter(id => id !== currentFirebaseId);
            currentUser.following = currentUser.following.filter(id => id !== targetFirebaseId);
        } else {
            targetUser.followers.push(currentFirebaseId);
            currentUser.following.push(targetFirebaseId);
        }

        await targetUser.save();
        await currentUser.save();

        res.json({
            success: true,
            isFollowing: !isAlreadyFollowing,
            followersCount: targetUser.followers.length
        });
    } catch (err) {
        console.error('Error in follow toggle:', err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint to add/remove friend
app.post('/api/users/:targetFirebaseId/friend', async (req, res) => {
    try {
        const { targetFirebaseId } = req.params;
        const { currentFirebaseId } = req.body;
        if (!currentFirebaseId || currentFirebaseId === targetFirebaseId) {
            return res.status(400).json({ error: 'Action invalide' });
        }

        const targetUser = await User.findOne({ firebaseId: targetFirebaseId });
        const currentUser = await User.findOne({ firebaseId: currentFirebaseId });
        if (!targetUser || !currentUser) {
            return res.status(404).json({ error: 'Utilisateur introuvable' });
        }

        if (!Array.isArray(targetUser.friends)) targetUser.friends = [];
        if (!Array.isArray(currentUser.friends)) currentUser.friends = [];

        const isFriend = targetUser.friends.includes(currentFirebaseId);
        if (isFriend) {
            targetUser.friends = targetUser.friends.filter(id => id !== currentFirebaseId);
            currentUser.friends = currentUser.friends.filter(id => id !== targetFirebaseId);
        } else {
            targetUser.friends.push(currentFirebaseId);
            currentUser.friends.push(targetFirebaseId);
        }

        await targetUser.save();
        await currentUser.save();

        res.json({
            success: true,
            isFriend: !isFriend,
            friendsCount: targetUser.friends.length
        });
    } catch (err) {
        console.error('Error in friend toggle:', err);
        res.status(500).json({ error: err.message });
    }
});

const onlineUsers = new Map();

function broadcastOnlineUsers() {
    const list = Array.from(onlineUsers.values()).map(u => ({
        socketId: u.socketId,
        firebaseId: u.firebaseId,
        name: u.name,
        avatar: u.avatar || '👤',
        status: u.status || 'available',
        sessionId: u.sessionId || null
    }));
    io.emit('online_users_update', list);
}

function handlePlayerLeave(sessionId, playerId) {
    const session = gameManager.getSession(sessionId);
    const leavingUser = onlineUsers.get(playerId);
    
    // Clear any disconnect timers for this session
    for (const [key, timer] of disconnectTimers.entries()) {
        if (key.startsWith(`${sessionId}_`)) {
            clearTimeout(timer);
            disconnectTimers.delete(key);
        }
    }

    if (session) {
        clearTimeout(session.roundTimer);
        clearTimeout(session.autoAdvanceTimer);

        // Notify all players in this session that it is terminated and they should go home
        const leavingName = leavingUser?.name || "L'autre joueur";
        io.to(sessionId).emit('session_closed', {
            message: `Le lobby est fermé à cause de la déconnexion de ${leavingName}.`,
            reason: 'player_left',
            leavingPlayerId: playerId
        });

        // Make all players in this session available in onlineUsers
        if (session.players) {
            for (const pId of Object.keys(session.players)) {
                const u = onlineUsers.get(pId);
                if (u) {
                    u.status = 'available';
                    u.sessionId = null;
                }
            }
        }

        // Delete and thoroughly clean the session from GameManager
        gameManager.destroySession(sessionId);
    }

    if (leavingUser) {
        leavingUser.status = 'available';
        leavingUser.sessionId = null;
    }
    broadcastOnlineUsers();
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join personal user room for direct notifications
    socket.on('register_user', (firebaseId) => {
        if (firebaseId) {
            socket.join(`user_${firebaseId}`);
        }
    });

    // Register / update online user identity
    socket.on('register_online_user', ({ firebaseId, name, avatar }) => {
        if (firebaseId) {
            socket.join(`user_${firebaseId}`);
        }
        const existing = onlineUsers.get(socket.id);
        onlineUsers.set(socket.id, {
            socketId: socket.id,
            firebaseId: firebaseId || null,
            name: formatPlayerName(name) || 'Joueur',
            avatar: avatar || '👤',
            status: existing?.status || 'available',
            sessionId: existing?.sessionId || null
        });
        broadcastOnlineUsers();
    });

    socket.on('get_online_users', () => {
        socket.emit('online_users_update', Array.from(onlineUsers.values()).map(u => ({
            socketId: u.socketId,
            firebaseId: u.firebaseId,
            name: u.name,
            avatar: u.avatar || '👤',
            status: u.status || 'available',
            sessionId: u.sessionId || null
        })));
    });

    socket.on('create_session', async ({ mode, vocabList, settings, playerName, firebaseId, avatar, clientPlayerKey }) => {
        let finalVocabList = vocabList || [];
        
        if (mode === 'random_duel') {
            try {
                // Fetch public lists from DB only if connected to avoid hanging
                let publicLists = [];
                if (mongoose.connection.readyState === 1) {
                    publicLists = await List.find({ isPublic: true }, 'words').lean();
                }
                const allWords = [];
                // Add example lists
                exampleLists.forEach(list => allWords.push(...(list.words || [])));
                // Add public lists
                publicLists.forEach(list => allWords.push(...(list.words || [])));
                
                // Shuffle and pick 50
                const shuffled = allWords.sort(() => 0.5 - Math.random());
                finalVocabList = shuffled.slice(0, 50).map((w, idx) => ({ 
                    id: idx + 1, 
                    question: (w.question || w.frenchPrompt || w.french || '').trim(), 
                    answer: (w.answer || w.germanWord || w.german || w.word || '').trim() 
                })).filter(w => w.question && w.answer);
                
                // Ensure settings rounds matches the capped length
                if (!settings) settings = {};
                settings.rounds = finalVocabList.length;
            } catch (err) {
                console.error("Erreur serveur lors de la génération aléatoire :", err);
                socket.emit('error', "Erreur serveur lors de la création du lobby aléatoire.");
                return;
            }
        }

        const formattedPlayerName = formatPlayerName(playerName);
        const sessionId = gameManager.createSession(socket.id, formattedPlayerName, firebaseId, clientPlayerKey);
        gameManager.setVocabList(sessionId, finalVocabList, settings);
        socket.join(sessionId);
        const session = gameManager.getSession(sessionId);
        
        const userObj = onlineUsers.get(socket.id);
        if (userObj) {
            userObj.status = 'in_lobby';
            userObj.sessionId = sessionId;
            if (formattedPlayerName) userObj.name = formattedPlayerName;
            if (avatar) userObj.avatar = avatar;
            broadcastOnlineUsers();
        }

        socket.emit('session_created', session);
    });

    socket.on('join_session', ({ sessionId, playerName, firebaseId, avatar, clientPlayerKey }) => {
        const formattedPlayerName = formatPlayerName(playerName);
        const result = gameManager.joinSession(sessionId, socket.id, formattedPlayerName, firebaseId, clientPlayerKey);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            socket.join(sessionId);
            const userObj = onlineUsers.get(socket.id);
            if (userObj) {
                userObj.status = 'in_lobby';
                userObj.sessionId = sessionId;
                if (formattedPlayerName) userObj.name = formattedPlayerName;
                if (avatar) userObj.avatar = avatar;
                broadcastOnlineUsers();
            }

            io.to(sessionId).emit('player_joined', result.session.players);
            socket.emit('session_joined', result.session);

            // Announce in lobby chat
            io.to(sessionId).emit('lobby_chat_message', {
                id: Math.random().toString(36).substring(2, 9),
                isSystem: true,
                text: `${formattedPlayerName || 'Un nouveau joueur'} a rejoint la salle d'attente ! 👋`,
                timestamp: Date.now()
            });
        }
    });

    // Lobby Chat messaging
    socket.on('send_lobby_chat', ({ sessionId, text, senderName, senderAvatar, id }) => {
        if (!sessionId || !text || !text.trim()) return;
        const msg = {
            id: id || (Math.random().toString(36).substring(2, 9) + Date.now()),
            senderId: socket.id,
            senderName: formatPlayerName(senderName) || 'Joueur',
            senderAvatar: senderAvatar || '💬',
            text: text.trim(),
            timestamp: Date.now()
        };
        io.to(sessionId).emit('lobby_chat_message', msg);
    });

    // Floating Reactions (Telegram Burst explosion particles)
    socket.on('send_reaction_burst', ({ sessionId, roomId, particles, emoji, senderName }) => {
        const targetSessionId = sessionId || roomId;
        if (!targetSessionId) return;

        // Clean and extract emoji if string contains text
        let cleanEmoji = emoji;
        if (cleanEmoji && typeof cleanEmoji === 'string') {
            const match = cleanEmoji.match(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u);
            cleanEmoji = match ? match[0] : cleanEmoji.split(' ')[0];
        }

        io.to(targetSessionId).emit('floating_reaction_burst', {
            emoji: cleanEmoji,
            particles: Array.isArray(particles) ? particles : null,
            senderName: formatPlayerName(senderName) || 'Joueur',
            senderId: socket.id
        });
    });

    socket.on('send_reaction_emoji', ({ sessionId, roomId, emoji, senderName }) => {
        const targetSessionId = sessionId || roomId;
        if (!targetSessionId || !emoji) return;
        const match = typeof emoji === 'string' ? emoji.match(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u) : null;
        const cleanEmoji = match ? match[0] : (typeof emoji === 'string' ? emoji.split(' ')[0] : '✨');
        const reactionPayload = {
            id: Math.random().toString(36).substring(2, 9) + Date.now(),
            emoji: cleanEmoji,
            senderName: formatPlayerName(senderName) || 'Joueur',
            senderId: socket.id,
            xPos: Math.floor(Math.random() * 65) + 15
        };
        io.to(targetSessionId).emit('floating_reaction', reactionPayload);
    });

    // Game Invites
    socket.on('send_game_invite', ({ targetSocketId, targetFirebaseId, sessionId }) => {
        const session = gameManager.getSession(sessionId);
        if (!session) {
            return socket.emit('error', "La session n'existe plus.");
        }
        const sender = onlineUsers.get(socket.id) || { name: 'Un hôte', avatar: '🎮' };
        
        const inviteData = {
            inviteId: Math.random().toString(36).substring(2, 10),
            sessionId: session.id,
            hostSocketId: socket.id,
            hostName: sender.name,
            hostAvatar: sender.avatar,
            vocabList: session.vocabList || [],
            settings: session.settings || { rounds: (session.vocabList || []).length, timePerWord: 15 },
            createdAt: Date.now()
        };

        // Strictly target other socket only, never host
        if (targetSocketId && targetSocketId !== socket.id) {
            io.to(targetSocketId).emit('game_invite_received', inviteData);
        } else if (targetFirebaseId) {
            socket.to(`user_${targetFirebaseId}`).emit('game_invite_received', inviteData);
        }
        
        socket.emit('invite_sent_success', { targetSocketId, targetFirebaseId });
    });

    socket.on('respond_game_invite', ({ inviteId, hostSocketId, accepted, sessionId, playerName, avatar }) => {
        if (hostSocketId) {
            io.to(hostSocketId).emit('invite_response', {
                inviteId,
                accepted,
                playerName: formatPlayerName(playerName) || 'Invité',
                avatar: avatar || '👤'
            });
        }
    });

    socket.on('start_game', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session && session.hostId === socket.id) {
            // Cleanly clear existing timers and reset question/round progress
            clearTimeout(session.roundTimer);
            clearTimeout(session.autoAdvanceTimer);
            clearTimeout(session.startGameTimer);
            session.currentQuestionIndex = -1;
            session.answersThisRound = 0;
            session.readyPlayers = new Set();
            for (const pId in session.players) {
                session.players[pId].score = 0;
                session.players[pId].answers = {};
            }

            session.status = 'playing';
            
            // Randomize questions for the session if they weren't already cut
            if (session.vocabList.length === session.settings.rounds) {
                // Shuffle to ensure random order
                session.vocabList.sort(() => Math.random() - 0.5);
            }
            
            for (const pId in session.players) {
                const u = onlineUsers.get(pId);
                if (u) u.status = 'in_game';
            }
            broadcastOnlineUsers();

            io.to(sessionId).emit('game_started');
            
            // Wait a moment for clients to render the Game component before sending the first question
            session.startGameTimer = setTimeout(() => {
                sendNextQuestion(sessionId);
            }, 1000);
        }
    });

    socket.on('submit_answer', ({ sessionId, answer, timeRemaining }) => {
        const result = gameManager.submitAnswer(sessionId, socket.id, answer, timeRemaining);
        
        // Real-time opponent answered notification
        if (sessionId) {
            socket.to(sessionId).emit('opponent_answered', { playerId: socket.id });
        }

        if (result && result.powerUpTarget) {
            io.to(result.powerUpTarget).emit('powerup_frozen', 3); // freeze for 3 seconds
        }

        if (result && result.allAnswered) {
            // Both answered, clear timer and move to next
            const session = gameManager.getSession(sessionId);
            clearTimeout(session.roundTimer);
            handleRoundEnd(sessionId);
        }
    });

    socket.on('submit_matching_pairs', ({ sessionId }) => {
        const result = gameManager.submitMatchingPairs(sessionId, socket.id);
        
        if (result && result.allAnswered) {
            const session = gameManager.getSession(sessionId);
            clearTimeout(session.roundTimer);
            handleRoundEnd(sessionId);
        }
    });

    socket.on('use_joker', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session && session.status === 'playing') {
            const word = session.vocabList[session.currentQuestionIndex].answer;
            const parts = word.trim().split(' ');
            let jokerHint = word.charAt(0) + '...';
            if (parts.length > 1 && ['der', 'die', 'das'].includes(parts[0].toLowerCase())) {
                const article = parts[0];
                const noun = parts.slice(1).join(' ');
                const nounLetters = noun.substring(0, Math.min(2, noun.length));
                jokerHint = `${article} ${nounLetters}...`;
            } else if (word.length > 2) {
                jokerHint = word.substring(0, 2) + '...';
            }
            socket.emit('joker_result', jokerHint);
        }
    });

    socket.on('leave_session', (sessionId) => {
        socket.leave(sessionId);
        handlePlayerLeave(sessionId, socket.id);
    });

    socket.on('kick_player', ({ sessionId, playerId }) => {
        const session = gameManager.getSession(sessionId);
        if (session && session.hostId === socket.id) {
            handlePlayerLeave(sessionId, playerId);
            io.to(playerId).emit('kicked');
            const sockets = io.sockets.sockets;
            const kickedSocket = sockets.get(playerId);
            if (kickedSocket) kickedSocket.leave(sessionId);
        }
    });

    socket.on('update_session_words', ({ sessionId, vocabList, changeDescription }) => {
        const session = gameManager.getSession(sessionId);
        if (session && session.hostId === socket.id) {
            session.vocabList = vocabList;
            if (session.settings.rounds > vocabList.length) {
                session.settings.rounds = Math.max(1, vocabList.length);
            }
            io.to(sessionId).emit('session_updated', session);
            const desc = changeDescription || `La liste des mots a été mise à jour (${vocabList.length} mots).`;
            io.to(sessionId).emit('lobby_chat_message', {
                id: Math.random().toString(36).substring(2, 9),
                isSystem: true,
                text: `📝 ${desc}`,
                timestamp: Date.now()
            });
        }
    });

    socket.on('update_session_settings', ({ sessionId, settings, changeDescription }) => {
        const session = gameManager.getSession(sessionId);
        if (session && session.hostId === socket.id) {
            session.settings = { ...session.settings, ...settings };
            io.to(sessionId).emit('session_updated', session);
            const desc = changeDescription || `Paramètres mis à jour : ${session.settings.timePerWord}s/mot, ${session.settings.rounds} questions${session.settings.powerupsEnabled ? ', Pouvoirs 🥶' : ''}.`;
            io.to(sessionId).emit('lobby_chat_message', {
                id: Math.random().toString(36).substring(2, 9),
                isSystem: true,
                text: `⚙️ ${desc}`,
                timestamp: Date.now()
            });
        }
    });

    socket.on('rematch', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session) {
            clearTimeout(session.roundTimer);
            clearTimeout(session.autoAdvanceTimer);
            session.status = 'waiting';
            session.currentQuestionIndex = -1;
            session.answersThisRound = 0;
            session.readyPlayers = new Set();
            for (const pId in session.players) {
                session.players[pId].score = 0;
                session.players[pId].answers = {};
                const u = onlineUsers.get(pId);
                if (u) {
                    u.status = 'in_lobby';
                    u.sessionId = sessionId;
                }
            }
            broadcastOnlineUsers();
            io.to(sessionId).emit('session_joined', session); // Send back to lobby
            io.to(sessionId).emit('lobby_chat_message', {
                id: Math.random().toString(36).substring(2, 9),
                isSystem: true,
                text: `🔄 Revanche lancée ! De retour dans la salle d'attente.`,
                timestamp: Date.now()
            });
        }
    });

    // Propose rematch to opponent
    socket.on('propose_rematch', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (!session) return;
        const requester = onlineUsers.get(socket.id) || { name: 'Un joueur', avatar: '🔄' };
        socket.to(sessionId).emit('rematch_proposal', {
            requesterSocketId: socket.id,
            requesterName: requester.name,
            requesterAvatar: requester.avatar
        });
    });

    // Accept rematch
    socket.on('accept_rematch', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session) {
            clearTimeout(session.roundTimer);
            clearTimeout(session.autoAdvanceTimer);
            session.status = 'waiting';
            session.currentQuestionIndex = -1;
            session.answersThisRound = 0;
            session.readyPlayers = new Set();
            for (const pId in session.players) {
                session.players[pId].score = 0;
                session.players[pId].answers = {};
                const u = onlineUsers.get(pId);
                if (u) {
                    u.status = 'in_lobby';
                    u.sessionId = sessionId;
                }
            }
            broadcastOnlineUsers();
            io.to(sessionId).emit('session_joined', session); // Send back to lobby
            io.to(sessionId).emit('lobby_chat_message', {
                id: Math.random().toString(36).substring(2, 9),
                isSystem: true,
                text: `🔄 Revanche acceptée ! De retour dans la salle d'attente.`,
                timestamp: Date.now()
            });
        }
    });

    // Decline rematch
    socket.on('decline_rematch', ({ sessionId, requesterSocketId }) => {
        const decliner = onlineUsers.get(socket.id) || { name: 'L\'adversaire' };
        if (requesterSocketId) {
            io.to(requesterSocketId).emit('rematch_declined', {
                declinerName: decliner.name
            });
        }
    });

    // Cancel rematch proposal
    socket.on('cancel_rematch', (sessionId) => {
        socket.to(sessionId).emit('rematch_cancelled');
    });

    // Propose to retry failed words together
    socket.on('propose_retry_failed_words', ({ sessionId, failedWords }) => {
        const session = gameManager.getSession(sessionId);
        if (!session) return;
        const requester = onlineUsers.get(socket.id) || { name: 'Un joueur', avatar: '🎯' };
        socket.to(sessionId).emit('retry_failed_words_proposal', {
            requesterSocketId: socket.id,
            requesterName: requester.name,
            requesterAvatar: requester.avatar,
            failedWords,
            count: failedWords.length
        });
    });

    // Accept proposal to retry failed words
    socket.on('accept_retry_failed_words', ({ sessionId, failedWords }) => {
        const session = gameManager.getSession(sessionId);
        if (!session) return;
        clearTimeout(session.roundTimer);
        clearTimeout(session.autoAdvanceTimer);
        session.vocabList = failedWords.map((w, idx) => ({ ...w, id: idx + 1 }));
        session.settings.rounds = session.vocabList.length;
        session.status = 'waiting';
        session.currentQuestionIndex = -1;
        session.answersThisRound = 0;
        session.readyPlayers = new Set();
        for (const pId in session.players) {
            session.players[pId].score = 0;
            session.players[pId].answers = {};
            const u = onlineUsers.get(pId);
            if (u) {
                u.status = 'in_lobby';
                u.sessionId = sessionId;
            }
        }
        broadcastOnlineUsers();
        io.to(sessionId).emit('session_joined', session); // Brings everyone back to Lobby with failed words
        io.to(sessionId).emit('lobby_chat_message', {
            id: Math.random().toString(36).substring(2, 9),
            isSystem: true,
            text: `🎯 Revanche sur les ${session.vocabList.length} mots manqués acceptée ! De retour dans la salle d'attente.`,
            timestamp: Date.now()
        });
    });

    // Decline proposal to retry failed words
    socket.on('decline_retry_failed_words', ({ sessionId, requesterSocketId }) => {
        const decliner = onlineUsers.get(socket.id) || { name: 'L\'adversaire' };
        if (requesterSocketId) {
            io.to(requesterSocketId).emit('retry_failed_words_declined', {
                declinerName: decliner.name
            });
        }
    });

    // Cancel retry failed words proposal
    socket.on('cancel_retry_failed_words', (sessionId) => {
        socket.to(sessionId).emit('retry_failed_words_cancelled');
    });

    // In-game Pause handling
    socket.on('request_pause', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (!session) return;
        if (session.settings?.allowPause === false) {
            socket.emit('pause_disabled');
            return;
        }
        pauseGame(sessionId, 'player_pause', socket.id);
    });

    socket.on('resume_game', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (!session) return;
        resumeGame(sessionId);
    });

    // In-game & Pause Chat Messages
    socket.on('game_chat_message', ({ sessionId, text, preset, id }) => {
        const session = gameManager.getSession(sessionId);
        if (!session) return;
        const sender = onlineUsers.get(socket.id) || {
            name: session.players[socket.id]?.name || 'Joueur',
            avatar: '🦊'
        };
        const cleanText = (text || '').trim();
        if (!cleanText) return;

        const chatPayload = {
            id: id || (Math.random().toString(36).substring(2, 9) + Date.now()),
            senderId: socket.id,
            senderName: formatPlayerName(sender.name) || 'Joueur',
            senderAvatar: sender.avatar || '🦊',
            text: cleanText,
            preset: Boolean(preset),
            timestamp: Date.now()
        };

        io.to(sessionId).emit('game_chat_message', chatPayload);
    });

    socket.on('request_terminate', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (!session) return;
        const playerIds = Object.keys(session.players);
        if (playerIds.length <= 1) {
            // Solo: End immediately
            clearTimeout(session.roundTimer);
            clearTimeout(session.autoAdvanceTimer);
            session.currentQuestionIndex = session.vocabList.length;
            sendNextQuestion(sessionId);
        } else {
            // Multi: pause game for both with blur and emit terminate request
            pauseGame(sessionId, 'leave_request', socket.id);
            const requester = onlineUsers.get(socket.id) || { name: session.players[socket.id]?.name || 'Un joueur' };
            
            // Opponent gets terminate_requested modal
            socket.to(sessionId).emit('terminate_requested', {
                requesterId: socket.id,
                requesterName: requester.name
            });
            // Requester gets pending modal with cancel button
            socket.emit('terminate_pending', {
                requesterId: socket.id
            });
        }
    });

    socket.on('cancel_terminate', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (!session) return;
        if (session.isPaused && session.pauseReason === 'leave_request') {
            resumeGame(sessionId);
            io.to(sessionId).emit('terminate_cancelled');
        }
    });

    socket.on('accept_terminate', (sessionId) => {
        handlePlayerLeave(sessionId, socket.id);
    });

    socket.on('refuse_terminate', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session) {
            if (session.isPaused && session.pauseReason === 'leave_request') {
                resumeGame(sessionId);
            }
            const playerIds = Object.keys(session.players);
            const otherId = playerIds.find(id => id !== socket.id);
            if (otherId) {
                io.to(otherId).emit('terminate_refused');
            }
            io.to(sessionId).emit('terminate_cancelled');
        }
    });

    socket.on('ready_for_next', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (!session || session.status !== 'showing_results') return;

        // Mark this player as ready
        if (!session.readyPlayers) session.readyPlayers = new Set();
        session.readyPlayers.add(socket.id);

        const totalPlayers = Object.keys(session.players).length;
        const readyCount = session.readyPlayers.size;

        // Broadcast how many are ready
        io.to(sessionId).emit('ready_count', { ready: readyCount, total: totalPlayers });

        if (readyCount >= totalPlayers) {
            // All players ready → go to next question
            clearTimeout(session.autoAdvanceTimer);
            session.status = 'playing';
            session.readyPlayers = new Set();
            sendNextQuestion(sessionId);
        }
    });

    // Direct Rejoin active session (game or lobby)
    const handleRejoin = ({ sessionId, clientPlayerKey, firebaseId, playerName, avatar }) => {
        if (!sessionId) {
            socket.emit('rejoin_failed', { reason: "Code de session manquant." });
            return;
        }

        const session = gameManager.getSession(sessionId);
        if (!session) {
            socket.emit('rejoin_failed', { reason: "Session introuvable ou expirée." });
            return;
        }

        // Find the player in session
        let foundPlayerId = null;
        let foundPlayer = null;

        for (const [pId, p] of Object.entries(session.players || {})) {
            if (
                (clientPlayerKey && p.clientPlayerKey && p.clientPlayerKey === clientPlayerKey) ||
                (firebaseId && p.firebaseId && p.firebaseId === firebaseId) ||
                pId === socket.id ||
                (p.disconnected && (p.name === playerName || Object.keys(session.players).length === 1))
            ) {
                foundPlayerId = pId;
                foundPlayer = p;
                break;
            }
        }

        // Fallback: if session only has 1 disconnected player, allow reconnection
        if (!foundPlayer) {
            for (const [pId, p] of Object.entries(session.players || {})) {
                if (p.disconnected) {
                    foundPlayerId = pId;
                    foundPlayer = p;
                    break;
                }
            }
        }

        if (!foundPlayer) {
            socket.emit('rejoin_failed', { reason: "Joueur non reconnu dans cette session." });
            return;
        }

        // Cancel any pending disconnect countdown timers for this player
        const timerKey = `${sessionId}_${foundPlayerId}`;
        if (disconnectTimers.has(timerKey)) {
            clearTimeout(disconnectTimers.get(timerKey));
            disconnectTimers.delete(timerKey);
        }

        // Update socket mapping
        if (foundPlayerId !== socket.id) {
            const oldSocket = io.sockets.sockets.get(foundPlayerId);
            
            delete session.players[foundPlayerId];
            foundPlayer.id = socket.id;
            if (clientPlayerKey) foundPlayer.clientPlayerKey = clientPlayerKey;
            foundPlayer.disconnected = false;
            delete foundPlayer.disconnectedAt;
            session.players[socket.id] = foundPlayer;

            // Disconnect old phantom socket now that it's out of the session
            if (oldSocket) {
                console.log(`Force disconnecting phantom socket: ${foundPlayerId}`);
                oldSocket.disconnect(true);
            }

            if (session.hostId === foundPlayerId) session.hostId = socket.id;
            if (session.guestId === foundPlayerId) session.guestId = socket.id;
        } else {
            foundPlayer.disconnected = false;
            delete foundPlayer.disconnectedAt;
        }

        socket.join(sessionId);

        // Update online user registry
        const formattedPlayerName = formatPlayerName(playerName) || foundPlayer.name;
        const u = onlineUsers.get(socket.id);
        if (u) {
            u.status = session.status === 'playing' || session.status === 'showing_results' ? 'in_game' : 'in_lobby';
            u.sessionId = sessionId;
            if (formattedPlayerName) u.name = formattedPlayerName;
            if (avatar) u.avatar = avatar;
            broadcastOnlineUsers();
        }

        // Resume game if it was paused for disconnect
        if (session.isPaused && session.pauseReason === 'disconnect_grace') {
            resumeGame(sessionId);
        }

        // Notify reconnecting player with full state
        socket.emit('rejoin_success', {
            session,
            status: session.status,
            isHost: session.hostId === socket.id
        });

        // Notify room
        if (session.status === 'waiting') {
            io.to(sessionId).emit('player_joined', session.players);
            io.to(sessionId).emit('session_updated', session);
            io.to(sessionId).emit('lobby_chat_message', {
                id: Math.random().toString(36).substring(2, 9),
                isSystem: true,
                text: `${foundPlayer.name} est de retour dans la salle d'attente ! 👋`,
                timestamp: Date.now()
            });
        } else {
            io.to(sessionId).emit('player_reconnected', {
                playerId: socket.id,
                playerName: foundPlayer.name
            });
        }
    };

    socket.on('rejoin_session', handleRejoin);
    socket.on('rejoin_game_session', handleRejoin);

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        handlePlayerDisconnect(socket);
        onlineUsers.delete(socket.id);
        broadcastOnlineUsers();
    });
});

const disconnectTimers = new Map();

function handlePlayerDisconnect(socket) {
    for (const [sessionId, session] of gameManager.sessions.entries()) {
        if (session.players && session.players[socket.id]) {
            handlePlayerLeave(sessionId, socket.id);
        }
    }
}

async function handleDisconnectForfeit(sessionId, forfeitedSocketId) {
    const session = gameManager.getSession(sessionId);
    if (!session || session.status === 'finished') return;

    clearTimeout(session.roundTimer);
    clearTimeout(session.autoAdvanceTimer);

    const forfeitedPlayer = session.players[forfeitedSocketId];
    const remainingPlayerId = Object.keys(session.players).find(id => id !== forfeitedSocketId);
    const remainingPlayer = remainingPlayerId ? session.players[remainingPlayerId] : null;

    session.status = 'finished';
    session.isPaused = false;
    session.pauseReason = null;

    // Record DB stats: victory for remaining player, loss for forfeiter
    if (forfeitedPlayer?.firebaseId) {
        try {
            await User.findOneAndUpdate(
                { firebaseId: forfeitedPlayer.firebaseId },
                { $inc: { gamesPlayed: 1 } }
            );
        } catch (e) {
            console.error("DB error on forfeit:", e);
        }
    }

    if (remainingPlayer?.firebaseId) {
        try {
            const dbUser = await User.findOne({ firebaseId: remainingPlayer.firebaseId });
            if (dbUser) {
                dbUser.gamesPlayed += 1;
                dbUser.gamesWon += 1;
                dbUser.xp += Math.max(remainingPlayer.score || 0, 100);
                dbUser.level = Math.floor(dbUser.xp / 1000) + 1;
                await dbUser.save();
            }
        } catch (e) {
            console.error("DB error on forfeit victory:", e);
        }
    }

    io.to(sessionId).emit('forfeit_game_over', {
        players: session.players,
        winnerId: remainingPlayerId,
        winnerName: remainingPlayer?.name || 'Adversaire',
        forfeitedName: forfeitedPlayer?.name || 'Joueur déconnecté',
        vocabList: session.vocabList
    });
}

function pauseGame(sessionId, reason, bySocketId, extraData = {}) {
    const session = gameManager.getSession(sessionId);
    if (!session || session.status === 'finished') return false;
    if (session.isPaused) return true;

    session.isPaused = true;
    session.pauseReason = reason;
    session.pausedBy = bySocketId;

    // Clear active timers
    clearTimeout(session.roundTimer);
    clearTimeout(session.autoAdvanceTimer);

    // Calculate time remaining for current round
    if (session.status === 'playing' && session.roundStartTime && session.roundDuration) {
        const elapsed = Date.now() - session.roundStartTime;
        session.roundTimeRemaining = Math.max(500, session.roundDuration - elapsed);
    } else if (session.status === 'showing_results' && session.resultStartTime && session.resultDuration) {
        const elapsed = Date.now() - session.resultStartTime;
        session.resultTimeRemaining = Math.max(500, session.resultDuration - elapsed);
    }

    const requesterUser = onlineUsers.get(bySocketId);
    const requesterName = requesterUser?.name || session.players[bySocketId]?.name || 'Un joueur';

    io.to(sessionId).emit('game_paused', {
        reason,
        pausedBy: bySocketId,
        pausedByName: requesterName,
        timeRemaining: (session.roundTimeRemaining || session.settings.timePerWord * 1000) / 1000,
        ...extraData
    });
    return true;
}

function resumeGame(sessionId) {
    const session = gameManager.getSession(sessionId);
    if (!session || !session.isPaused) return false;

    session.isPaused = false;
    const previousReason = session.pauseReason;
    session.pauseReason = null;
    session.pausedBy = null;

    if (session.status === 'playing') {
        const remMs = session.roundTimeRemaining || (session.settings.timePerWord * 1000);
        session.roundStartTime = Date.now();
        session.roundDuration = remMs;
        session.roundTimer = setTimeout(() => {
            handleRoundEnd(sessionId);
        }, remMs);

        io.to(sessionId).emit('game_resumed', {
            previousReason,
            timeRemaining: remMs / 1000,
            status: 'playing'
        });
    } else if (session.status === 'showing_results') {
        const remMs = session.resultTimeRemaining || 2000;
        session.resultStartTime = Date.now();
        session.resultDuration = remMs;
        session.autoAdvanceTimer = setTimeout(() => {
            if (session.status === 'showing_results' && !session.isPaused) {
                session.status = 'playing';
                session.readyPlayers = new Set();
                sendNextQuestion(sessionId);
            }
        }, remMs);

        io.to(sessionId).emit('game_resumed', {
            previousReason,
            timeRemaining: remMs / 1000,
            status: 'showing_results'
        });
    } else {
        io.to(sessionId).emit('game_resumed', { previousReason });
    }
    return true;
}

function sendNextQuestion(sessionId) {
    const next = gameManager.nextQuestion(sessionId);
    const session = gameManager.getSession(sessionId);
    if (!session) return;
    
    if (next.finished) {
        // Update DB stats
        Object.values(session.players).forEach(async (p) => {
            if (p.firebaseId) {
                try {
                    const dbUser = await User.findOne({ firebaseId: p.firebaseId });
                    if (dbUser) {
                        dbUser.xp += p.score;
                        dbUser.gamesPlayed += 1;
                        
                        // Check if won
                        const maxScore = Math.max(...Object.values(session.players).map(x => x.score));
                        if (p.score === maxScore) {
                            dbUser.gamesWon += 1;
                        }

                        // Level up logic: every 1000 XP = 1 level
                        dbUser.level = Math.floor(dbUser.xp / 1000) + 1;
                        
                        // Update daily XP history, streak, and lastSeen
                        recordUserDailyXpAndStreak(dbUser, p.score);
                        
                        // Update failed words
                        Object.entries(p.answers || {}).forEach(([idxStr, ans]) => {
                            if (ans && ans.score < 100) {
                                const qIdx = parseInt(idxStr, 10);
                                const currentVocab = session.vocabList?.[qIdx];
                                const questionText = currentVocab?.question || '';
                                const wordEntry = dbUser.failedWords.find(w => w.word === ans.expected);
                                if (wordEntry) {
                                    wordEntry.count += 1;
                                    if (!wordEntry.question && questionText) wordEntry.question = questionText;
                                } else {
                                    dbUser.failedWords.push({ word: ans.expected, question: questionText, count: 1 });
                                }
                            }
                        });

                        await dbUser.save();
                    }
                } catch (err) {
                    console.error("Error updating user stats:", err);
                }
            }
        });

        io.to(sessionId).emit('game_over', { players: session.players, vocabList: session.vocabList });
    } else {
        session.roundStartTime = Date.now();
        session.roundDuration = session.settings.timePerWord * 1000;
        session.roundTimeRemaining = session.roundDuration;
        session.isPaused = false;
        session.pauseReason = null;

        const payload = {
            questionIndex: session.currentQuestionIndex,
            totalQuestions: session.vocabList.length,
            duration: session.settings.timePerWord,
            question_type: next.question_type
        };

        if (next.question_type === 'matching_pairs') {
            payload.pairs = next.pairs;
        } else {
            payload.question = next.question.question;
        }

        io.to(sessionId).emit('new_question', payload);

        // Start timer only if not in tutorial/infinite mode
        if (session.settings.timePerWord < 300 && !session.settings.isTutorial) {
            session.roundTimer = setTimeout(() => {
                handleRoundEnd(sessionId);
            }, session.roundDuration);
        }
    }
}

function handleRoundEnd(sessionId) {
    const session = gameManager.getSession(sessionId);
    if (!session) return;
    
    // Reset ready players
    session.readyPlayers = new Set();
    session.status = 'showing_results';
    session.resultStartTime = Date.now();
    session.resultDuration = 2000;
    session.resultTimeRemaining = 2000;

    // Send round results
    io.to(sessionId).emit('round_results', {
        players: session.players,
        correctAnswer: session.vocabList?.[session.currentQuestionIndex]?.answer || ''
    });

    // Fallback: auto-advance after 2s if no one presses ready
    session.autoAdvanceTimer = setTimeout(() => {
        if (session.status === 'showing_results' && !session.isPaused) {
            session.status = 'playing';
            session.readyPlayers = new Set();
            sendNextQuestion(sessionId);
        }
    }, session.resultDuration);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
