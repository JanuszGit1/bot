const fs = require('fs').promises;
const path = require('path');

// Ścieżka do pliku, w którym będziemy przechowywać historię rzutów monetą
const coinFlipHistoryPath = path.join(__dirname, 'coinflip_history.json');

// Funkcja sprawdzająca, czy plik istnieje
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Funkcja do ładowania historii rzutów monetą
async function loadCoinFlipHistory() {
    if (!await fileExists(coinFlipHistoryPath)) return [];
    try {
        const data = await fs.readFile(coinFlipHistoryPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("[ERROR] Błąd przy ładowaniu historii rzutów monetą:", err);
        return [];
    }
}

// Funkcja zapisująca historię rzutów monetą
async function saveCoinFlipHistory(history) {
    try {
        await fs.writeFile(coinFlipHistoryPath, JSON.stringify(history, null, 2), 'utf8');
    } catch (err) {
        console.error("[ERROR] Błąd przy zapisie historii rzutów monetą:", err);
    }
}

// Funkcja losująca wynik rzutu monetą
function flipCoin() {
    return Math.random() < 0.5 ? 'Orzeł' : 'Reszka';
}

// Funkcja zapisująca wynik rzutu do historii
async function addCoinFlipToHistory(result) {
    const history = await loadCoinFlipHistory();
    history.push({
        result,
        date: Date.now()
    });
    await saveCoinFlipHistory(history);
}

// Funkcja obsługująca komendę !coinflip
async function handleCoinFlipCommand(command) {
    if (command.toLowerCase() === '!coinflip') {
        const result = flipCoin();
        console.log(`[BOT] 🎲 Wyrzucono monetą: ${result}`);

        await addCoinFlipToHistory(result);

        return `🎲 Wyrzucono monetą: ${result}`;
    }

    return "❌ Nie rozpoznano komendy!";
}

// Funkcja obsługująca komendę !historiamoneta
async function handleCoinFlipHistoryCommand(command) {
    if (command.toLowerCase() === '!historiamoneta') {
        const history = await loadCoinFlipHistory();

        if (!history.length) {
            return "📭 Brak zapisanych rzutów monetą.";
        }

        // Bierzemy ostatnie 5 rzutów (lub mniej)
        const recentRolls = history.slice(-5).reverse();

        const formatted = recentRolls.map((entry, index) => {
            const date = new Date(entry.date).toLocaleString('pl-PL');
            return `#${index + 1}: 🎲 ${entry.result} (🕒 ${date})`;
        });

        return `📜 Ostatnie rzuty monetą:\n${formatted.join('\n')}`;
    }

    return "❌ Nie rozpoznano komendy!";
}

module.exports = { handleCoinFlipCommand, handleCoinFlipHistoryCommand };
