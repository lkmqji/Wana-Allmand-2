@echo off
title Lancement de l'application
echo ==============================================
echo   Demarrage de l'application en local...
echo ==============================================
echo.

:: Se positionner dans le dossier du script
cd /d "%~dp0"

:: 1. Lancer le Backend (Server) dans une fenetre separee
echo [1/3] Lancement du serveur Backend (Port 3001)...
start "Backend Server (Port 3001)" cmd /k "cd /d "%~dp0server" && echo === SERVEUR BACKEND === && npm start"

:: 2. Lancer le Frontend (Client) dans une fenetre separee
echo [2/3] Lancement du client Frontend (Vite)...
start "Frontend Client (Vite)" cmd /k "cd /d "%~dp0client" && echo === CLIENT FRONTEND === && npm run dev"

:: 3. Attendre 3 secondes que les serveurs soient prets
echo [3/3] Ouverture du site dans le navigateur...
timeout /t 3 /nobreak >nul

:: 4. Ouvrir le navigateur
start http://localhost:5173

echo.
echo ==============================================
echo   Tout est pret ! Votre site est ouvert.
echo   Ne fermez pas les fenetres noires (terminaux).
echo ==============================================
exit
