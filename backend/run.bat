@echo off
echo.
echo ================================================
echo       LMS PROJECT - LANCEMENT SERVEUR
echo ================================================
echo.

:: Active ton environnement virtuel (change le chemin si différent)
call venv\Scripts\activate

:: Met à jour uvicorn la version qui marche à 100% sur Windows
pip install --upgrade uvicorn[standard] websockets --force-reinstall --quiet

:: Lance le serveur ASGI avec les bons paramètres Windows
python -m uvicorn backend.asgi:application --host 0.0.0.0 --port 8000 --reload --ws auto

echo.
echo Serveur lancé sur http://localhost:8000
echo Appuie sur Ctrl+C pour arrêter
pause