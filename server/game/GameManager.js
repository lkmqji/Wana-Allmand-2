const { calculateScore } = require('../utils/levenshtein');
const { formatPlayerName } = require('../utils/formatters');

class GameManager {
    constructor() {
        // sessions map: sessionId -> session object
        this.sessions = new Map();
        this.forceMatchingPairs = false;

        // Periodic Garbage Collection sweep for stale/abandoned sessions (every 15 minutes)
        // unref() ensures this background timer does not hold open the Node.js event loop
        this._gcInterval = setInterval(() => {
            this.cleanStaleSessions();
        }, 15 * 60 * 1000);
        if (this._gcInterval.unref) {
            this._gcInterval.unref();
        }
    }

    createSession(hostId, hostName, firebaseId, clientPlayerKey) {
        // Generate a random 4 letter/number code
        const sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const formattedName = formatPlayerName(hostName) || 'Hôte';
        
        this.sessions.set(sessionId, {
            id: sessionId,
            hostId: hostId,
            guestId: null,
            status: 'waiting', // waiting, playing, showing_results, finished
            vocabList: [],
            settings: { rounds: 0, timePerWord: 15, powerupsEnabled: false, allowPause: true },
            currentQuestionIndex: -1,
            players: {
                [hostId]: { id: hostId, firebaseId: firebaseId || null, clientPlayerKey: clientPlayerKey || null, name: formattedName, score: 0, answers: {} }
            },
            roundTimer: null,
            autoAdvanceTimer: null,
            readyPlayers: new Set(),
            answersThisRound: 0,
            createdAt: Date.now(),
            lastActivity: Date.now()
        });

        return sessionId;
    }

    joinSession(sessionId, guestId, guestName, firebaseId, clientPlayerKey) {
        const session = this.sessions.get(sessionId);
        if (!session) return { error: "Session introuvable." };
        if (session.guestId) return { error: "Session déjà pleine." };
        
        const formattedName = formatPlayerName(guestName) || 'Invité';
        session.guestId = guestId;
        session.players[guestId] = { id: guestId, firebaseId: firebaseId || null, clientPlayerKey: clientPlayerKey || null, name: formattedName, score: 0, answers: {} };
        session.lastActivity = Date.now();
        return { success: true, session };
    }

    leaveSession(sessionId, playerId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        delete session.players[playerId];
        session.lastActivity = Date.now();

        if (session.guestId === playerId) {
            session.guestId = null;
        } else if (session.hostId === playerId) {
            if (session.guestId) {
                session.hostId = session.guestId; // Guest becomes host
                session.guestId = null;
            } else {
                this.destroySession(sessionId);
                return { destroyed: true };
            }
        }

        if (Object.keys(session.players).length === 0) {
            this.destroySession(sessionId);
            return { destroyed: true };
        }

        return { session };
    }

    /**
     * Completely cleans and removes a session from memory to prevent RAM / timer leaks.
     */
    destroySession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        // Clear active timeouts
        if (session.roundTimer) {
            clearTimeout(session.roundTimer);
            session.roundTimer = null;
        }
        if (session.autoAdvanceTimer) {
            clearTimeout(session.autoAdvanceTimer);
            session.autoAdvanceTimer = null;
        }

        // Clean up data structures
        if (session.readyPlayers && typeof session.readyPlayers.clear === 'function') {
            session.readyPlayers.clear();
        }
        session.players = {};
        session.vocabList = [];

        // Delete from Map
        return this.sessions.delete(sessionId);
    }

    /**
     * Automatic garbage collection for stale/abandoned sessions.
     */
    cleanStaleSessions(maxAgeMs = 2 * 60 * 60 * 1000) {
        const now = Date.now();
        for (const [sessionId, session] of this.sessions.entries()) {
            const age = now - (session.lastActivity || session.createdAt || now);
            const isFinished = session.status === 'finished' && age > 15 * 60 * 1000; // 15 mins post-game
            const isStale = age > maxAgeMs;
            const isEmpty = !session.players || Object.keys(session.players).length === 0;

            if (isFinished || isStale || isEmpty) {
                this.destroySession(sessionId);
            }
        }
    }

    setVocabList(sessionId, vocabList, settings) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.vocabList = vocabList;
            const rounds = (settings && typeof settings.rounds === 'number' && settings.rounds > 0)
                ? Math.min(settings.rounds, vocabList.length)
                : vocabList.length;
            session.settings = {
                ...(settings || {}),
                rounds: rounds,
                timePerWord: settings?.timePerWord || 15
            };
            session.currentQuestionIndex = -1;
            session.answersThisRound = 0;
            session.lastActivity = Date.now();
        }
    }

    getSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.lastActivity = Date.now();
        }
        return session;
    }
    
    submitAnswer(sessionId, playerId, answer, timeRemaining) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'playing') return null;

        session.lastActivity = Date.now();
        const currentWord = session.vocabList[session.currentQuestionIndex];
        const { score, isTypo } = calculateScore(currentWord.answer, answer);
        
        // Bonus for speed (optional)
        const bonus = (score === 100 && timeRemaining > 0) ? Math.floor(timeRemaining) : 0;
        const totalScore = score + bonus;

        session.players[playerId].answers[session.currentQuestionIndex] = {
            answer,
            expected: currentWord.answer,
            score: totalScore,
            isTypo
        };
        
        session.players[playerId].score += totalScore;
        session.answersThisRound += 1;

        // Check for 3-streak
        let streak = 0;
        for (let i = session.currentQuestionIndex; i >= 0; i--) {
            const ans = session.players[playerId].answers[i];
            if (ans && ans.score >= 100) streak++;
            else break;
        }

        let powerUpTarget = null;
        if (session.settings.powerupsEnabled !== false && streak > 0 && streak % 3 === 0) {
            powerUpTarget = Object.keys(session.players).find(id => id !== playerId);
        }

        return {
            allAnswered: session.answersThisRound === Object.keys(session.players).length,
            playerScore: session.players[playerId].score,
            powerUpTarget
        };
    }

    nextQuestion(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        session.lastActivity = Date.now();
        session.answersThisRound = 0;
        session.currentQuestionIndex += 1;

        const maxQuestions = (session.settings && session.settings.rounds > 0)
            ? Math.min(session.settings.rounds, session.vocabList.length)
            : session.vocabList.length;

        if (session.currentQuestionIndex >= maxQuestions || session.currentQuestionIndex >= session.vocabList.length) {
            session.status = 'finished';
            return { finished: true };
        }

        // Probability to trigger matching pairs mini-game if we have at least 5 words in the vocab list
        const chance = this.forceMatchingPairs ? 1.0 : 0.5;
        if (session.vocabList.length >= 5 && Math.random() < chance) {
            // Pick 5 random words
            const shuffledVocab = [...session.vocabList].sort(() => 0.5 - Math.random());
            const selectedPairs = shuffledVocab.slice(0, 5);
            
            // Create left and right sides
            const leftWords = selectedPairs.map(p => ({ id: p.id || p.question, text: p.question }));
            const rightWords = selectedPairs.map(p => ({ id: p.id || p.question, text: p.answer }));
            
            // Shuffle both independently
            leftWords.sort(() => 0.5 - Math.random());
            rightWords.sort(() => 0.5 - Math.random());
            
            return {
                finished: false,
                question_type: 'matching_pairs',
                pairs: { left: leftWords, right: rightWords }
            };
        }

        return { finished: false, question_type: 'classic', question: session.vocabList[session.currentQuestionIndex] };
    }

    submitMatchingPairs(sessionId, playerId) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'playing') return null;

        session.lastActivity = Date.now();
        
        // Jackpot score: +300 points for being the first to finish
        const jackpotScore = 300;
        session.players[playerId].score += jackpotScore;
        session.answersThisRound = Object.keys(session.players).length; // Force allAnswered true so round ends

        return {
            allAnswered: true,
            playerScore: session.players[playerId].score,
            powerUpTarget: null,
            winnerName: session.players[playerId].name
        };
    }
}

module.exports = new GameManager();
