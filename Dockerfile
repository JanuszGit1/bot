# Użyj obrazu Node.js 18
FROM node:18

# Ustaw katalog roboczy
WORKDIR /app

# Skopiuj package.json i zainstaluj zależności
COPY package*.json ./
RUN npm install

# Skopiuj resztę plików projektu
COPY . .

# Jeśli nie używasz serwera (np. Express), nie musisz EXPOSE
# Jeśli używasz – EXPOSE odpowiedni port np. 3000
# EXPOSE 3000

# Uruchom bota
CMD ["node", "node_bot.js"]
