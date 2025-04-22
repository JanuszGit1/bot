const axios = require('axios');

async function getRandomMeme() {
    try {
        // Wysyłanie zapytania do API meme bez kategorii
        const response = await axios.get("https://meme-api.com/gimme"); // API bez kategorii
        const { url } = response.data;

        if (url) {
            return url; // Zwracamy tylko URL obrazka
        } else {
            throw new Error("Nie znaleziono URL mema w odpowiedzi.");
        }
    } catch (error) {
        throw new Error("Błąd połączenia z API meme: " + error.message); // Obsługuje błędy połączenia
    }
}

module.exports = { getRandomMeme };
