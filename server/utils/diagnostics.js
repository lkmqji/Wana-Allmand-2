/**
 * Module de diagnostic serveur en temps réel
 * - Détection du lag de l'Event Loop (thread principal bloqué > 100ms)
 * - Traçage propre des exceptions et promesses non gérées (uncaughtException, unhandledRejection)
 * - Surveillance périodique de la mémoire vive (RAM / heapUsed / RSS)
 */

function initDiagnostics(options = {}) {
    const lagThresholdMs = options.lagThresholdMs || 100;
    const memoryIntervalMs = options.memoryIntervalMs || 60 * 1000; // 1 minute
    const lagCheckIntervalMs = options.lagCheckIntervalMs || 500;

    console.log('\x1b[36m[DIAGNOSTICS] Module de diagnostic serveur activé.\x1b[0m');

    // 1. Écouteur pour les exceptions non capturées
    process.on('uncaughtException', (err, origin) => {
        const timestamp = new Date().toISOString();
        console.error(`\n\x1b[41m\x1b[37m[💥 UNCAUGHT EXCEPTION - ${timestamp}]\x1b[0m`);
        console.error(`\x1b[31mOrigine: ${origin}\x1b[0m`);
        console.error(`\x1b[31mErreur: ${err?.message || err}\x1b[0m`);
        if (err?.stack) {
            console.error(`\x1b[31mStack Trace:\n${err.stack}\x1b[0m\n`);
        }
    });

    // 2. Écouteur pour les rejets de promesses non gérés
    process.on('unhandledRejection', (reason, promise) => {
        const timestamp = new Date().toISOString();
        console.error(`\n\x1b[45m\x1b[37m[⚡ UNHANDLED REJECTION - ${timestamp}]\x1b[0m`);
        if (reason instanceof Error) {
            console.error(`\x1b[35mMessage: ${reason.message}\x1b[0m`);
            console.error(`\x1b[35mStack Trace:\n${reason.stack}\x1b[0m\n`);
        } else {
            console.error(`\x1b[35mRaison:`, reason, `\x1b[0m\n`);
        }
    });

    // 3. Détection des lags de l'Event Loop
    let lastCheckTime = Date.now();
    const lagTimer = setInterval(() => {
        const now = Date.now();
        const delta = now - lastCheckTime;
        const lag = delta - lagCheckIntervalMs;

        if (lag > lagThresholdMs) {
            const timestamp = new Date().toISOString();
            console.warn(
                `\x1b[31m[⚠️ AVERTISSEMENT - EVENT LOOP LAG - ${timestamp}] ` +
                `Retard de cycle détecté : ${lag.toFixed(2)}ms (seuil : ${lagThresholdMs}ms). ` +
                `Le thread principal Node.js a été bloqué par du code synchrone ou une opération lourde.\x1b[0m`
            );
        }

        lastCheckTime = Date.now();
    }, lagCheckIntervalMs);
    lagTimer.unref();

    // 4. Surveillance de la consommation de mémoire (RAM) toutes les minutes
    const memoryTimer = setInterval(() => {
        const timestamp = new Date().toISOString();
        const mem = process.memoryUsage();
        const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);

        console.log(
            `\x1b[36m[📊 RAM USAGE - ${timestamp}]\x1b[0m ` +
            `RSS: \x1b[33m${toMB(mem.rss)} MB\x1b[0m | ` +
            `Heap Utilisé: \x1b[32m${toMB(mem.heapUsed)} MB\x1b[0m / ${toMB(mem.heapTotal)} MB | ` +
            `Externe: ${toMB(mem.external)} MB | ` +
            `Buffers: ${toMB(mem.arrayBuffers || 0)} MB`
        );
    }, memoryIntervalMs);
    memoryTimer.unref();
}

module.exports = { initDiagnostics };
