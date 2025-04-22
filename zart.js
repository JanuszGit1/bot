const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Ścieżka do pliku, w którym będziemy przechowywać historię żartów
const jokesPath = path.join(__dirname, 'jokes.json');

// Funkcja sprawdzająca, czy plik istnieje
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Funkcja do ładowania żartów z pliku JSON
async function loadJokes() {
    if (!await fileExists(jokesPath)) return [];
    try {
        const data = await fs.readFile(jokesPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("[ERROR] Błąd przy ładowaniu żartów:", err);
        return [];
    }
}

// Funkcja do zapisywania żartów do pliku JSON
async function saveJokes(jokes) {
    try {
        await fs.writeFile(jokesPath, JSON.stringify(jokes, null, 2), 'utf8');
    } catch (err) {
        console.error("[ERROR] Błąd przy zapisie żartów:", err);
    }
}

// Funkcja do tłumaczenia tekstu na polski
async function translateToPolish(text) {
    const encodedText = encodeURIComponent(text);
    const translateURL = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pl&dt=t&q=${encodedText}`;

    try {
        const response = await fetch(translateURL);
        const json = await response.json();
        return json[0].map(item => item[0]).join('');
    } catch (err) {
        console.error("[⚠️] Błąd tłumaczenia:", err);
        return "❌ Błąd podczas tłumaczenia żartu.";
    }
}

// Funkcja pobierająca żart z API
async function fetchAndTranslateJoke() {
    const apiURL = "https://v2.jokeapi.dev/joke/Any?safe-mode&type=single&lang=en";
    try {
        const response = await fetch(apiURL);
        const data = await response.json();

        if (data.error || !data.joke) return "❌ Nie udało się pobrać żartu.";

        const translated = await translateToPolish(data.joke);
        return translated;
    } catch (err) {
        console.error("[🚨] Błąd podczas żartu:", err);
        return "❌ Wystąpił problem z żartem.";
    }
}

// Funkcja do zapisania żartu w historii
async function addJokeToHistory(joke) {
    const jokes = await loadJokes();
    jokes.push({
        joke,
        date: Date.now()
    });
    await saveJokes(jokes);
}

// Funkcja obsługująca komendę `!żart`
async function handleJokeCommand(command) {
    if (command.toLowerCase().startsWith("!żart")) {
        const joke = await fetchAndTranslateJoke();
        console.log(`[BOT] → ${joke}`); // Wysyła żart
        await addJokeToHistory(joke); // Zapisuje żart w historii
        return joke; // Zwraca żart
    }
    return "❌ Nie rozpoznano komendy!";
}

module.exports = { handleJokeCommand };
