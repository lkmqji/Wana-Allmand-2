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
require('dotenv').config();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // allow all for MVP
        methods: ["GET", "POST"]
    }
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

// ---- PUBLIC CONFIG ENDPOINT ----
app.get('/api/config', async (req, res) => {
    try {
        let config = await Config.findOne({ key: 'app_config' });
        if (!config) config = await Config.create({ key: 'app_config' });
        res.json({ 
            guestMode: config.guestMode ?? true,
            maintenanceMode: config.maintenanceMode ?? false,
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
        
        // Sum total games played
        const users = await User.find().select('gamesPlayed xp');
        const totalGamesPlayed = users.reduce((acc, u) => acc + (u.gamesPlayed || 0), 0);
        const totalXp = users.reduce((acc, u) => acc + (u.xp || 0), 0);
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
        const users = await User.find().sort({ xp: -1 }).lean();
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
        const query = userId && userId !== 'guest' 
            ? { $or: [{ userId: 'ALL' }, { userId: userId }] }
            : { userId: 'ALL' };

        const notifs = await Notification.find(query).sort({ createdAt: -1 }).limit(50).lean();
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

// Endpoint for AI text/file extraction
app.post('/api/extract', upload.single('file'), async (req, res) => {
    try {
        const text = req.body.text || "";
        const file = req.file;
        
        if (!text.trim() && !file) {
            return res.status(400).json({ error: "Aucun contenu fourni." });
        }

        if (process.env.GEMINI_API_KEY) {
            try {
                let prompt = `Tu es un assistant linguistique. Extrais toutes les paires de mots ou phrases (Français -> Anglais -> Allemand avec article der/die/das si nom) du contenu fourni. Renvoie STRICTEMENT un tableau JSON au format exact: [{"question": "mot français", "english": "english translation", "answer": "mot allemand avec article"}] sans texte additionnel. Si un texte t'est fourni, base toi dessus. Si une image/audio/fichier t'est fourni, extrais-en le vocabulaire.\n\nTexte supplémentaire:\n${text}`;
                
                if (text.startsWith("THEME:")) {
                    const theme = text.replace("THEME:", "").trim();
                    prompt = `Tu es un assistant linguistique. Génère une liste de 15 mots essentiels ou pertinents (niveau A2/B1) sur le thème suivant : "${theme}". Renvoie STRICTEMENT un tableau JSON au format exact: [{"question": "mot français", "english": "english translation", "answer": "mot allemand avec article der/die/das"}] sans texte additionnel.`;
                }

                const parts = [{ text: prompt }];
                
                if (file) {
                    const mimeType = file.mimetype;
                    const base64Data = file.buffer.toString('base64');
                    parts.push({
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    });
                }
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: parts }]
                    })
                });
                
                const data = await response.json();
                if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    let rawText = data.candidates[0].content.parts[0].text.trim();
                    if (rawText.startsWith('```json')) rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
                    if (rawText.startsWith('```')) rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
                    const parsed = JSON.parse(rawText);
                    const vocabList = parsed.map((item, idx) => ({ 
                        id: idx + 1, 
                        question: item.question, 
                        english: item.english || "",
                        answer: item.answer 
                    }));
                    if (vocabList.length > 0) {
                        return res.json({ vocabList });
                    }
                }
            } catch (aiErr) {
                console.error("Gemini API call error, falling back to line parsing:", aiErr);
            }
        }

        // Fallback rule-based line parser (only works for text)
        if (!text) {
             return res.status(500).json({ error: "L'IA est requise pour extraire le vocabulaire depuis un fichier média." });
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
        users.forEach(u => userMap[u.firebaseId] = u.name);
        
        const listsWithCreator = publicLists.map(l => ({
            ...l,
            creatorName: userMap[l.userId] || '?'
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
        const updatedList = await List.findByIdAndUpdate(
            req.params.id, 
            { name, words },
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

app.post('/api/users/sync', async (req, res) => {
    try {
        const { firebaseId, name } = req.body;
        let user = await User.findOne({ firebaseId });
        if (!user) {
            user = await User.create({ firebaseId, name });
        } else if (user.name !== name) {
            user.name = name;
            await user.save();
        }
        res.json(user);
    } catch (err) {
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
            name: name || 'Joueur',
            avatar: avatar || '👤',
            status: existing?.status || 'available',
            sessionId: existing?.sessionId || null
        });
        broadcastOnlineUsers();
    });

    socket.on('get_online_users', () => {
        broadcastOnlineUsers();
    });

    const handlePlayerLeave = (sessionId, playerId) => {
        const result = gameManager.leaveSession(sessionId, playerId);
        const leavingUser = onlineUsers.get(playerId);
        if (leavingUser) {
            leavingUser.status = 'available';
            leavingUser.sessionId = null;
            broadcastOnlineUsers();
        }
        if (result && !result.destroyed) {
            io.to(sessionId).emit('player_joined', result.session.players);
            // Si l'hôte vient de changer, informez le nouveau
            io.to(sessionId).emit('session_joined', result.session);
            io.to(sessionId).emit('lobby_chat_message', {
                id: Math.random().toString(36).substring(2, 9),
                isSystem: true,
                text: `${leavingUser?.name || 'Un joueur'} a quitté la salle.`,
                timestamp: Date.now()
            });
        }
    };

    socket.on('create_session', ({ vocabList, settings, playerName, firebaseId, avatar }) => {
        const sessionId = gameManager.createSession(socket.id, playerName, firebaseId);
        gameManager.setVocabList(sessionId, vocabList, settings);
        socket.join(sessionId);
        
        const userObj = onlineUsers.get(socket.id);
        if (userObj) {
            userObj.status = 'in_lobby';
            userObj.sessionId = sessionId;
            if (playerName) userObj.name = playerName;
            if (avatar) userObj.avatar = avatar;
            broadcastOnlineUsers();
        }

        socket.emit('session_created', sessionId);
    });

    socket.on('join_session', ({ sessionId, playerName, firebaseId, avatar }) => {
        const result = gameManager.joinSession(sessionId, socket.id, playerName, firebaseId);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            socket.join(sessionId);
            const userObj = onlineUsers.get(socket.id);
            if (userObj) {
                userObj.status = 'in_lobby';
                userObj.sessionId = sessionId;
                if (playerName) userObj.name = playerName;
                if (avatar) userObj.avatar = avatar;
                broadcastOnlineUsers();
            }

            io.to(sessionId).emit('player_joined', result.session.players);
            socket.emit('session_joined', result.session);

            // Announce in lobby chat
            io.to(sessionId).emit('lobby_chat_message', {
                id: Math.random().toString(36).substring(2, 9),
                isSystem: true,
                text: `${playerName || 'Un nouveau joueur'} a rejoint la salle d'attente ! 👋`,
                timestamp: Date.now()
            });
        }
    });

    // Lobby Chat messaging
    socket.on('send_lobby_chat', ({ sessionId, text, senderName, senderAvatar }) => {
        if (!sessionId || !text || !text.trim()) return;
        const msg = {
            id: Math.random().toString(36).substring(2, 9),
            senderId: socket.id,
            senderName: senderName || 'Joueur',
            senderAvatar: senderAvatar || '💬',
            text: text.trim(),
            timestamp: Date.now()
        };
        io.to(sessionId).emit('lobby_chat_message', msg);
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

        if (targetSocketId) {
            io.to(targetSocketId).emit('game_invite_received', inviteData);
        } else if (targetFirebaseId) {
            io.to(`user_${targetFirebaseId}`).emit('game_invite_received', inviteData);
        }
        
        socket.emit('invite_sent_success', { targetSocketId, targetFirebaseId });
    });

    socket.on('respond_game_invite', ({ inviteId, hostSocketId, accepted, sessionId, playerName, avatar }) => {
        if (hostSocketId) {
            io.to(hostSocketId).emit('invite_response', {
                inviteId,
                accepted,
                playerName: playerName || 'Invité',
                avatar: avatar || '👤'
            });
        }
    });

    socket.on('start_game', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session && session.hostId === socket.id) {
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
            setTimeout(() => {
                sendNextQuestion(sessionId);
            }, 1000);
        }
    });

    socket.on('submit_answer', ({ sessionId, answer, timeRemaining }) => {
        const result = gameManager.submitAnswer(sessionId, socket.id, answer, timeRemaining);
        
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

    socket.on('rematch', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session) {
            session.status = 'waiting';
            session.currentQuestionIndex = -1;
            session.answersThisRound = 0;
            for (const pId in session.players) {
                session.players[pId].score = 0;
                session.players[pId].answers = {};
                const u = onlineUsers.get(pId);
                if (u) u.status = 'in_lobby';
            }
            broadcastOnlineUsers();
            io.to(sessionId).emit('session_joined', session); // Send back to lobby
        }
    });

    socket.on('request_terminate', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (!session) return;
        const playerIds = Object.keys(session.players);
        if (playerIds.length === 1) {
            // Solo: End immediately
            clearTimeout(session.roundTimer);
            session.currentQuestionIndex = session.vocabList.length;
            sendNextQuestion(sessionId);
        } else {
            // Multi: ask opponent
            const otherId = playerIds.find(id => id !== socket.id);
            if (otherId) {
                io.to(otherId).emit('terminate_requested');
            }
        }
    });

    socket.on('accept_terminate', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session) {
            clearTimeout(session.roundTimer);
            session.currentQuestionIndex = session.vocabList.length;
            sendNextQuestion(sessionId);
        }
    });

    socket.on('refuse_terminate', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session) {
            const playerIds = Object.keys(session.players);
            const otherId = playerIds.find(id => id !== socket.id);
            if (otherId) {
                io.to(otherId).emit('terminate_refused');
            }
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

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Chercher dans toutes les sessions si ce socket y était
        for (const [sessionId, session] of gameManager.sessions.entries()) {
            if (session.players[socket.id]) {
                handlePlayerLeave(sessionId, socket.id);
            }
        }
        onlineUsers.delete(socket.id);
        broadcastOnlineUsers();
    });
});

function sendNextQuestion(sessionId) {
    const next = gameManager.nextQuestion(sessionId);
    const session = gameManager.getSession(sessionId);
    
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
                        
                        // Update failed words
                        Object.values(p.answers).forEach(ans => {
                            if (ans.score < 100) {
                                const wordEntry = dbUser.failedWords.find(w => w.word === ans.expected);
                                if (wordEntry) wordEntry.count += 1;
                                else dbUser.failedWords.push({ word: ans.expected, count: 1 });
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
        io.to(sessionId).emit('new_question', {
            question: next.question.question,
            questionIndex: session.currentQuestionIndex,
            totalQuestions: session.vocabList.length,
            duration: session.settings.timePerWord
        });

        // Start timer
        session.roundTimer = setTimeout(() => {
            handleRoundEnd(sessionId);
        }, session.settings.timePerWord * 1000);
    }
}

function handleRoundEnd(sessionId) {
    const session = gameManager.getSession(sessionId);
    
    // Reset ready players
    session.readyPlayers = new Set();
    session.status = 'showing_results';

    // Send round results
    io.to(sessionId).emit('round_results', {
        players: session.players,
        correctAnswer: session.vocabList[session.currentQuestionIndex].answer
    });

    // Fallback: auto-advance after 1s if no one presses ready
    session.autoAdvanceTimer = setTimeout(() => {
        if (session.status === 'showing_results') {
            session.status = 'playing';
            session.readyPlayers = new Set();
            sendNextQuestion(sessionId);
        }
    }, 2000);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
