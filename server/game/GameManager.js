const { calculateScore } = require('../utils/levenshtein');
const { formatPlayerName } = require('../utils/formatters');

class GameManager {
    constructor() {
        // sessions map: sessionId -> session object
        this.sessions = new Map();
    }

    createSession(hostId, hostName, firebaseId) {
        // Generate a random 4 letter/number code
        const sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const formattedName = formatPlayerName(hostName) || 'Hôte';
        
        this.sessions.set(sessionId, {
            id: sessionId,
            hostId: hostId,
            guestId: null,
            status: 'waiting', // waiting, playing, finished
            vocabList: [],
            settings: { rounds: 0, timePerWord: 15, powerupsEnabled: false, allowPause: true },
            currentQuestionIndex: -1,
            players: {
                [hostId]: { id: hostId, firebaseId: firebaseId || null, name: formattedName, score: 0, answers: {} }
            },
            roundTimer: null,
            answersThisRound: 0
        });

        return sessionId;
    }

    joinSession(sessionId, guestId, guestName, firebaseId) {
        const session = this.sessions.get(sessionId);
        if (!session) return { error: "Session introuvable." };
        if (session.guestId) return { error: "Session déjà pleine." };
        
        const formattedName = formatPlayerName(guestName) || 'Invité';
        session.guestId = guestId;
        session.players[guestId] = { id: guestId, firebaseId: firebaseId || null, name: formattedName, score: 0, answers: {} };
        return { success: true, session };
    }

    leaveSession(sessionId, playerId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        delete session.players[playerId];
        if (session.guestId === playerId) {
            session.guestId = null;
        } else if (session.hostId === playerId) {
            // If host leaves, we might want to reassign host or destroy session.
            // For now, just mark hostId as null or reassign to guest if needed.
            // A simpler approach: if a player leaves, just remove them.
            if (session.guestId) {
                session.hostId = session.guestId; // Guest becomes host
                session.guestId = null;
            } else {
                this.sessions.delete(sessionId);
                return { destroyed: true };
            }
        }
        return { session };
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
        }
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    // Will be handled more complexly in index.js for timeouts, but this handles state
    submitAnswer(sessionId, playerId, answer, timeRemaining) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'playing') return null;

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

        session.answersThisRound = 0;
        session.currentQuestionIndex += 1;

        const maxQuestions = (session.settings && session.settings.rounds > 0)
            ? Math.min(session.settings.rounds, session.vocabList.length)
            : session.vocabList.length;

        if (session.currentQuestionIndex >= maxQuestions || session.currentQuestionIndex >= session.vocabList.length) {
            session.status = 'finished';
            return { finished: true };
        }

        return { finished: false, question: session.vocabList[session.currentQuestionIndex] };
    }
}

module.exports = new GameManager();
