const fs = require('fs').promises;
const path = require('path');

// Ścieżka do pliku, w którym będziemy przechowywać historię losowań
const choicesPath = path.join(__dirname, 'choices.json');

// Funkcja sprawdzająca, czy plik istnieje
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Funkcja do ładowania opcji z pliku JSON
async function loadChoices() {
    if (!await fileExists(choicesPath)) return [];
    try {
        const data = await fs.readFile(choicesPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("[ERROR] Błąd przy ładowaniu opcji:", err);
        return [];
    }
}

// Funkcja do zapisywania opcji do pliku JSON
async function saveChoices(choices) {
    try {
        await fs.writeFile(choicesPath, JSON.stringify(choices, null, 2), 'utf8');
    } catch (err) {
        console.error("[ERROR] Błąd przy zapisie opcji:", err);
    }
}

// Funkcja do walidacji opcji (np. aby upewnić się, że opcje nie są puste)
function validateOptions(options) {
    for (const option of options) {
        if (!option.trim()) {
            return "❌ Każda opcja musi zawierać tekst.";
        }
    }
    return null;
}

// Funkcja do losowania jednej z opcji
function chooseRandomOption(options) {
    const randomIndex = Math.floor(Math.random() * options.length);
    return options[randomIndex];
}

// Funkcja obsługująca komendę `!losuj`
async function handleLosujCommand(command) {
    if (command.toLowerCase().startsWith("!losuj")) {
        // Pobranie opcji z komendy
        const optionsText = command.replace(/^!losuj\s*/i, ''); // Usuwamy początkowy tekst komendy
        const options = optionsText.split(/\s*\|\s*/); // Opcje oddzielone pionową kreską | (np. opcja1 | opcja2)

        // Sprawdzenie, czy podano wystarczającą liczbę opcji
        if (options.length < 2) {
            return "❌ Musisz podać co najmniej dwie opcje oddzielone znakiem '|'.";
        }

        // Walidacja opcji
        const validationError = validateOptions(options);
        if (validationError) {
            return validationError;
        }

        // Losowanie opcji
        const chosenOption = chooseRandomOption(options);
        console.log(`[BOT] → Wylosowana opcja: ${chosenOption}`);

        // Zapisanie opcji w historii
        await addChoiceToHistory(chosenOption);

        return `🎲 Wylosowana opcja: ${chosenOption}`;
    }

    return "❌ Nie rozpoznano komendy!";
}

// Funkcja do zapisania wylosowanej opcji w historii
async function addChoiceToHistory(choice) {
    const choices = await loadChoices();
    choices.push({
        choice,
        date: Date.now()
    });
    await saveChoices(choices);
}

module.exports = { handleLosujCommand };
