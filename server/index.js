const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { parsePdf } = require('./utils/pdfParser');
const gameManager = require('./game/GameManager');

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

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('create_session', ({ vocabList, settings, playerName }) => {
        const sessionId = gameManager.createSession(socket.id, playerName);
        gameManager.setVocabList(sessionId, vocabList, settings);
        socket.join(sessionId);
        socket.emit('session_created', sessionId);
    });

    socket.on('join_session', ({ sessionId, playerName }) => {
        const result = gameManager.joinSession(sessionId, socket.id, playerName);
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
        
        if (result && result.allAnswered) {
            // Both answered, clear timer and move to next
            const session = gameManager.getSession(sessionId);
            clearTimeout(session.roundTimer);
            handleRoundEnd(sessionId);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Handle cleanup for MVP if needed (e.g., notify other player)
    });
});

function sendNextQuestion(sessionId) {
    const next = gameManager.nextQuestion(sessionId);
    const session = gameManager.getSession(sessionId);
    
    if (next.finished) {
        io.to(sessionId).emit('game_over', session.players);
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
