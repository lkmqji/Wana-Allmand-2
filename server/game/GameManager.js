const { calculateScore } = require('../utils/levenshtein');
const { formatPlayerName } = require('../utils/formatters');

class GameManager {
    constructor() {
        // sessions map: sessionId -> session object
        this.sessions = new Map();
    }

    createSession(hostId, hostName, firebaseId, clientPlayerKey) {
        // Generate a random 4 letter/number code
        const sessionId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const formattedName = formatPlayerName(hostName) || 'Hôte';
        
        this.sessions.set(sessionId, {
            id: sessionId,
            hostId: hostId,
            status: 'waiting', // waiting, playing, finished
            vocabList: [],
            settings: { 
                rounds: 0, 
                timePerWord: 15, 
                powerupsEnabled: false, 
                allowPause: true,
                maxPlayers: 8,
                gameMode: 'standard' // 'standard', 'luckentext', 'conjugation', 'visual'
            },
            currentQuestionIndex: -1,
            players: {
                [hostId]: { 
                    id: hostId, 
                    firebaseId: firebaseId || null, 
                    clientPlayerKey: clientPlayerKey || null, 
                    name: formattedName, 
                    score: 0, 
                    answers: {},
                    pausesUsed: 0
                }
            },
            roundTimer: null,
            autoAdvanceTimer: null,
            pauseSafetyTimer: null,
            answersThisRound: 0,
            readyPlayers: new Set()
        });

        return sessionId;
    }

    joinSession(sessionId, guestId, guestName, firebaseId, clientPlayerKey) {
        const session = this.sessions.get(sessionId);
        if (!session) return { error: "Session introuvable." };
        
        const maxPlayers = session.settings?.maxPlayers || 8;
        const currentCount = Object.keys(session.players || {}).length;
        if (currentCount >= maxPlayers) return { error: `Session pleine (max ${maxPlayers} joueurs).` };
        
        const formattedName = formatPlayerName(guestName) || `Joueur ${currentCount + 1}`;
        session.players[guestId] = { 
            id: guestId, 
            firebaseId: firebaseId || null, 
            clientPlayerKey: clientPlayerKey || null, 
            name: formattedName, 
            score: 0, 
            answers: {},
            pausesUsed: 0
        };

        return { success: true, session };
    }

    leaveSession(sessionId, playerId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;
        
        delete session.players[playerId];
        const remainingPlayerIds = Object.keys(session.players);

        if (remainingPlayerIds.length === 0) {
            clearTimeout(session.roundTimer);
            clearTimeout(session.autoAdvanceTimer);
            clearTimeout(session.pauseSafetyTimer);
            this.sessions.delete(sessionId);
            return { destroyed: true };
        }

        // If the host leaves, pass host authority to the next player
        if (session.hostId === playerId) {
            session.hostId = remainingPlayerIds[0];
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
                ...(session.settings || {}),
                ...(settings || {}),
                rounds: rounds,
                timePerWord: settings?.timePerWord || session.settings?.timePerWord || 15
            };
            session.currentQuestionIndex = -1;
            session.answersThisRound = 0;
        }
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
    
    submitAnswer(sessionId, playerId, answer, timeRemaining) {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'playing') return null;

        const currentWord = session.vocabList[session.currentQuestionIndex];
        const expected = currentWord.answer || currentWord.expected || '';
        const { score, isTypo } = calculateScore(expected, answer);
        
        // Bonus for speed
        const bonus = (score === 100 && timeRemaining > 0) ? Math.floor(timeRemaining) : 0;
        const totalScore = score + bonus;

        session.players[playerId].answers[session.currentQuestionIndex] = {
            answer,
            expected: expected,
            score: totalScore,
            isTypo
        };
        
        session.players[playerId].score += totalScore;
        session.answersThisRound += 1;

        // Check for 3-streak for powerups
        let streak = 0;
        for (let i = session.currentQuestionIndex; i >= 0; i--) {
            const ans = session.players[playerId].answers[i];
            if (ans && ans.score >= 100) streak++;
            else break;
        }

        // Target a random opponent or the leading opponent
        let powerUpTarget = null;
        if (session.settings.powerupsEnabled !== false && streak > 0 && streak % 3 === 0) {
            const opponents = Object.keys(session.players).filter(id => id !== playerId);
            if (opponents.length > 0) {
                // target opponent with highest score
                opponents.sort((a, b) => (session.players[b]?.score || 0) - (session.players[a]?.score || 0));
                powerUpTarget = opponents[0];
            }
        }

        const totalActivePlayers = Object.values(session.players).filter(p => !p.disconnected).length;

        return {
            allAnswered: session.answersThisRound >= totalActivePlayers,
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
