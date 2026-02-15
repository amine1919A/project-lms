# Image Node.js
FROM node:24.11.1

# Répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances npm
RUN npm install

# Copier le reste du code frontend
COPY . .

# Exposer le port 3000 pour le frontend
EXPOSE 3000

# Commande pour lancer le serveur de dev
CMD ["npm", "run", "dev"]
