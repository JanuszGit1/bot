const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'odp_data.json');

// Mapa przechowująca aktualne odpowiedzi (komenda => { question, correctAnswer, timestamp })
const odpMap = new Map();

// Wczytywanie danych z pliku przy starcie
async function loadOdpData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        for (const [cmd, value] of Object.entries(parsed)) {
            odpMap.set(cmd, value);
        }
        console.log("[✅] odpStore: Dane wczytane z pliku.");
    } catch (err) {
        if (err.code === 'ENOENT') {
            // Plik nie istnieje, co jest normalne na początku
            console.warn("[ℹ️] odpStore: Brak pliku z danymi, inicjalizacja pustej bazy.");
        } else {
            console.error("[❌] odpStore: Błąd przy wczytywaniu danych:", err);
        }
    }
}

// Zapis danych z pamięci do pliku
async function saveOdpData() {
    const plainObj = Object.fromEntries(odpMap);
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(plainObj, null, 2), 'utf8');
        console.log("[💾] odpStore: Dane zapisane do pliku.");
    } catch (err) {
        console.error("[❌] odpStore: Błąd przy zapisie danych:", err);
    }
}

// Ustaw poprawną odpowiedź dla danej komendy
async function setCorrectAnswer(commandName, question, correctAnswer) {
    odpMap.set(commandName.toLowerCase(), {
        question,
        correctAnswer,
        timestamp: Date.now()
    });
    await saveOdpData();
}

// Pobierz poprawną odpowiedź dla komendy
function getCorrectAnswer(commandName) {
    return odpMap.get(commandName.toLowerCase());
}

// Usuń dane dla danej komendy
async function clearAnswer(commandName) {
    odpMap.delete(commandName.toLowerCase());
    await saveOdpData();
}

// Zwraca historię ostatnich odpowiedzi (maksymalnie N)
function getLastAnswers(limit = 10) {
    const allEntries = Array.from(odpMap.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, limit);

    return allEntries.map(([cmd, data]) => ({
        komenda: cmd,
        pytanie: data.question,
        odpowiedz: data.correctAnswer,
        czas: new Date(data.timestamp).toLocaleString()
    }));
}

// Funkcja czekająca na odpowiedź użytkownika (z timeoutem)
async function waitForUserAnswer(page) {
    return new Promise((resolve, reject) => {
        let timeout;

        const onUserAnswer = (msg) => {
            // Upewnij się, że odpowiedź jest w odpowiednim formacie
            if (msg.startsWith("!odp zagadka")) {
                const answer = msg.split(" ")[2];  // Pobieramy odpowiedź użytkownika
                if (!answer) {
                    reject("❌ Odpowiedź nie jest poprawna!");
                    return;
                }
                clearTimeout(timeout);  // Anulujemy timeout, jeśli odpowiedź została wysłana
                resolve(answer);  // Zwracamy odpowiedź
            }
        };

        // Ustawiamy nasłuchiwacz na odpowiedzi
        page.on('message', onUserAnswer);

        // Ustawiamy timeout, który od razu wywoła błąd, jeśli czas minie
        timeout = setTimeout(() => {
            reject("❌ Czas oczekiwania na odpowiedź minął!");
            page.removeListener('message', onUserAnswer);  // Usuwamy nasłuchiwacz, gdy czas minie
        }, 30000);  // 30 sek.
    });
}

module.exports = {
    loadOdpData,
    saveOdpData,
    setCorrectAnswer,
    getCorrectAnswer,
    clearAnswer,
    getLastAnswers,
    waitForUserAnswer
};
