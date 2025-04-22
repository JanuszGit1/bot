const fs = require('fs');
const path = require('path'); // Importujemy moduł path

let rules = [];  // Lista zasad
let warnings = {}; // Przechowywanie ostrzeżeń dla użytkowników
let db = initDB();
let commandCooldown = {}; // Obiekt przechowujący czas ostatniej komendy dla użytkowników

// Ładowanie zasad z pliku
function loadRules() {
    if (fs.existsSync('rules.json')) {
        rules = JSON.parse(fs.readFileSync('rules.json', 'utf8'));
    }
}

// Funkcja zapisująca zasady do pliku
function saveRules() {
    fs.writeFileSync('rules.json', JSON.stringify(rules, null, 2), 'utf8');
}

// Funkcja do dodawania zasady
function addRule(rule) {
    rules.push(rule);
    saveRules();
    return `✅ Zasada "${rule}" została dodana.`;
}

// Funkcja do edytowania zasady
function editRule(index, newRule) {
    if (rules[index]) {
        rules[index] = newRule;
        saveRules();
        return `✅ Zasada została zmieniona na: "${newRule}".`;
    } else {
        return `❌ Nie znaleziono zasady o numerze ${index}.`;
    }
}

// Funkcja do usuwania zasady
function removeRule(index) {
    if (rules[index]) {
        const removedRule = rules.splice(index, 1);
        saveRules();
        return `✅ Zasada "${removedRule}" została usunięta.`;
    } else {
        return `❌ Nie znaleziono zasady o numerze ${index}.`;
    }
}

// Funkcja do wyświetlania zasad
function showRules() {
    if (rules.length === 0) return "❌ Brak zasad. Dodaj zasady za pomocą !zasady <dodaj> <treść zasady>.";
    let result = "📜 **Zasady grupy**:\n";
    rules.forEach((rule, index) => {
        result += `\n${index + 1}. ${rule}`;
    });
    return result;
}

// Funkcja do dodawania ostrzeżenia
function addWarning(user) {
    const now = Date.now();
    const cooldownTime = 5000; // Czas blokady komendy (w milisekundach) - 5 sekund

    // Sprawdzanie, czy użytkownik jest w okresie chłodzenia
    if (commandCooldown[user] && now - commandCooldown[user] < cooldownTime) {
        const timeLeft = Math.ceil((cooldownTime - (now - commandCooldown[user])) / 1000);
        return `⚠️ Proszę poczekać ${timeLeft} sekund przed ponownym użyciem komendy ostrzeżenia.`;
    }

    // Ustawienie nowego czasu dla komendy
    commandCooldown[user] = now;

    // Zwiększanie liczby ostrzeżeń
    if (!warnings[user]) warnings[user] = 0;
    warnings[user] += 1;

    // Sprawdzanie, czy użytkownik przekroczył limit ostrzeżeń
    if (warnings[user] >= 3) {
        delete warnings[user]; // Usuwamy użytkownika po 3 ostrzeżeniu
        return `❌ ${user} został usunięty z grupy po trzech ostrzeżeniach!`;
    }

    return `⚠️ Ostrzeżenie dla ${user}. Ma ${warnings[user]}/3 ostrzeżeń.`;
}

// Funkcja do wyświetlania liczby ostrzeżeń dla użytkownika
function showWarnings(user) {
    if (!warnings[user]) {
        return `⚠️ ${user} nie ma żadnych ostrzeżeń.`;
    }
    return `⚠️ ${user} ma ${warnings[user]}/3 ostrzeżenia.`;
}

// Przykład użycia w komendzie !ostrzeżenia:
function processCommand(command, user) {
    if (command === "!ostrzeżenia") {
        return showWarnings(user);
    }
    // Możesz dodać inne komendy tutaj
    return "❌ Nieznana komenda.";
}

// Funkcja do sprawdzania wulgaryzmów
function checkForSwearWords(message) {
    const swearWords = ['wulgaryzm1', 'wulgaryzm2', 'wulgaryzm3'];  // Można dodać więcej wulgaryzmów
    for (let word of swearWords) {
        if (message.toLowerCase().includes(word)) {
            return true;
        }
    }
    return false;
}

// Funkcja inicjalizująca bazę danych użytkowników
function initDB() {
    const dbPath = path.join(__dirname, 'db.json');
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}));
    }
    return JSON.parse(fs.readFileSync(dbPath));
}

// Funkcja zapisująca dane do bazy
function saveDB() {
    const dbPath = path.join(__dirname, 'db.json');
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

// Funkcja inicjalizująca użytkownika
function initUser(username) {
    if (!db[username]) {
        db[username] = {
            profileLink: "",
            history: []
        };
        saveDB();
    }
}

// Funkcja logująca akcję (np. dodanie profilu)
function logAction(username, type, by, reason = "") {
    initUser(username);
    const now = new Date().toISOString().replace("T", " ").split(".")[0];
    db[username].history.push({ type, by, date: now, reason });
    saveDB();
}

// Funkcja do usuwania użytkownika (np. z bazy)
function removeUser(username, by) {
    if (!db[username]) {
        return `❌ Użytkownik ${username} nie istnieje.`;
    }
    delete db[username];
    logAction(username, "usuń", by, `Użytkownik ${username} został usunięty z bazy.`);
    saveDB();
    return `🚫 Użytkownik ${username} został usunięty z bazy danych.`;
}

// Funkcja do zwracania historii użytkownika
function getHistory(username) {
    initUser(username);
    if (db[username].history.length === 0) return `ℹ️ Brak historii działań dla ${username}.`;
    return `📜 Historia ${username}:\n` + db[username].history.map(
        h => `• ${h.date} - ${h.type.toUpperCase()} od ${h.by}${h.reason ? ` (${h.reason})` : ""}`
    ).join("\n");
}

// Funkcja do wyświetlania pełnej historii akcji
function getFullStatus() {
    return Object.keys(db).map(user => {
        const u = db[user];
        return `👤 ${user}: ${u.profileLink ? `Link: ${u.profileLink}` : "Brak linku do profilu"}`;
    }).join("\n") || "👥 Brak użytkowników na liście.";
}

// Inicjalizowanie zasad i bazy danych
function init() {
    loadRules();
    db = initDB();
}

// Funkcja do pobierania i zapisywania obrazu
async function downloadImage(url, path) {
    try {
        console.log(`[INFO] Rozpoczynamy pobieranie obrazu z URL: ${url}`);
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
        });

        const writer = fs.createWriteStream(path);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`[INFO] Zapisano obraz do ${path}`);
                resolve();
            });

            writer.on('error', (err) => {
                console.error(`[ERROR] Wystąpił błąd podczas pobierania obrazu: ${err.message}`);
                fs.unlink(path, () => {});
                reject(err);
            });
        });
    } catch (err) {
        console.error(`[ERROR] Wystąpił błąd podczas pobierania obrazu: ${err.message}`);
        throw err;
    }
}

// Funkcja do kopiowania obrazu do schowka
async function copyImageToClipboard(imagePath) {
    const clipboardy = await import('clipboardy');
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        await clipboardy.write(imageBuffer.toString('base64'));
        console.log("[INFO] Obraz skopiowany do schowka.");
    } catch (error) {
        console.error("[ERROR] Błąd podczas kopiowania obrazu do schowka:", error);
        throw new Error("Nie udało się skopiować obrazu do schowka.");
    }
}

// Eksportowanie funkcji
module.exports = {
    loadRules,
    initDB,
    saveRules,
    addRule,
    editRule,
    removeRule,
    showRules,
    addWarning,
    checkForSwearWords,
    init,
    logAction,
    removeUser,
    getHistory,
    getFullStatus,
};
