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
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

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

// Endpoint for AI text extraction
app.post('/api/extract', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Aucun texte fourni." });
        }

        if (process.env.GEMINI_API_KEY) {
            try {
                const prompt = `Tu es un assistant linguistique allemand. Extrais toutes les paires de mots ou phrases (Français -> Allemand avec article der/die/das si nom) du texte suivant. Renvoie STRICTEMENT un tableau JSON au format: [{"question": "mot français", "answer": "mot allemand avec article"}] sans texte additionnel.\n\nTexte:\n${text}`;
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
                
                const data = await response.json();
                if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                    let rawText = data.candidates[0].content.parts[0].text.trim();
                    if (rawText.startsWith('```json')) rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
                    if (rawText.startsWith('```')) rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
                    const parsed = JSON.parse(rawText);
                    const vocabList = parsed.map((item, idx) => ({ id: idx + 1, question: item.question, answer: item.answer }));
                    if (vocabList.length > 0) {
                        return res.json({ vocabList });
                    }
                }
            } catch (aiErr) {
                console.error("Gemini API call error, falling back to line parsing:", aiErr);
            }
        }

        // Fallback rule-based line parser
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

// Endpoint to get lists for a user
app.get('/api/lists/:userId', async (req, res) => {
    try {
        const lists = await List.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(lists);
    } catch (err) {
        res.status(500).json({ error: err.message });
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

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('create_session', ({ vocabList, settings, playerName, firebaseId }) => {
        const sessionId = gameManager.createSession(socket.id, playerName, firebaseId);
        gameManager.setVocabList(sessionId, vocabList, settings);
        socket.join(sessionId);
        socket.emit('session_created', sessionId);
    });

    socket.on('join_session', ({ sessionId, playerName, firebaseId }) => {
        const result = gameManager.joinSession(sessionId, socket.id, playerName, firebaseId);
        if (result.error) {
            socket.emit('error', result.error);
        } else {
            socket.join(sessionId);
            io.to(sessionId).emit('player_joined', result.session.players);
            socket.emit('session_joined', result.session);
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

    socket.on('rematch', (sessionId) => {
        const session = gameManager.getSession(sessionId);
        if (session) {
            session.status = 'waiting';
            session.currentQuestionIndex = -1;
            session.answersThisRound = 0;
            for (const pId in session.players) {
                session.players[pId].score = 0;
                session.players[pId].answers = {};
            }
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

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
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
    
    // Send round results before next question
    io.to(sessionId).emit('round_results', {
        players: session.players,
        correctAnswer: session.vocabList[session.currentQuestionIndex].answer
    });

    // Wait a few seconds then send next question
    setTimeout(() => {
        sendNextQuestion(sessionId);
    }, 4000);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
