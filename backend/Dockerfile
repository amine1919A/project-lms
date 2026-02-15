# 1. Image de base Python
FROM python:3.14.2-slim

# 2. Répertoire de travail dans le container
WORKDIR /app

# 3. Copier uniquement le fichier requirements pour installer les dépendances
COPY requirements.txt .

# 4. Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copier tout le code du backend
COPY . .

# 6. Exposer le port 8000 pour accéder au backend depuis l'extérieur
EXPOSE 8000

# 7. Commande pour lancer le serveur avec uvicorn
CMD ["python", "-m", "uvicorn", "backend.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--reload"]
