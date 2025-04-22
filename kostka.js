const fs = require('fs').promises;
const path = require('path');

// Ścieżka do pliku historii rzutów kostką
const diceHistoryPath = path.join(__dirname, 'dice_history.json');

// Funkcja sprawdzająca, czy plik istnieje
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Funkcja ładująca historię rzutów kostką
async function loadDiceHistory() {
    if (!await fileExists(diceHistoryPath)) return [];
    try {
        const data = await fs.readFile(diceHistoryPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("[ERROR] Błąd przy ładowaniu historii kostki:", err);
        return [];
    }
}

// Funkcja zapisująca historię rzutów kostką
async function saveDiceHistory(history) {
    try {
        await fs.writeFile(diceHistoryPath, JSON.stringify(history, null, 2), 'utf8');
    } catch (err) {
        console.error("[ERROR] Błąd przy zapisie historii kostki:", err);
    }
}

// Funkcja losująca wynik kostki (1–6)
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

// Funkcja zapisująca wynik do historii
async function addDiceRollToHistory(result) {
    const history = await loadDiceHistory();
    history.push({
        result,
        date: Date.now()
    });
    await saveDiceHistory(history);
}

// Funkcja obsługująca komendę !rzućkostką
async function handleDiceRollCommand(command) {
    if (command.toLowerCase() === '!rzućkostką') {
        const result = rollDice();
        console.log(`[BOT] 🎲 Wyrzucono: ${result}`);

        await addDiceRollToHistory(result);

        return `🎲 Wyrzucono kostką: ${result}`;
    }

    return "❌ Nie rozpoznano komendy!";
}

// Funkcja obsługująca komendę !historiakostki
async function handleDiceHistoryCommand(command) {
    if (command.toLowerCase() === '!historiakostki') {
        const history = await loadDiceHistory();

        if (!history.length) {
            return "📭 Brak zapisanych rzutów kostką.";
        }

        // Bierzemy ostatnie 5 rzutów (lub mniej)
        const recentRolls = history.slice(-5).reverse();

        const formatted = recentRolls.map((entry, index) => {
            const date = new Date(entry.date).toLocaleString('pl-PL');
            return `#${index + 1}: 🎲 ${entry.result} (🕒 ${date})`;
        });

        return `📜 Ostatnie rzuty kostką:\n${formatted.join('\n')}`;
    }

    return "❌ Nie rozpoznano komendy!";
}

module.exports = {
    handleDiceRollCommand,
    handleDiceHistoryCommand
};
