const fs = require('fs').promises;  // Używamy wersji z obietnicami

// Funkcja do zapisania danych użytkowników do pliku
async function saveUserData(userData) {
    try {
        await fs.writeFile('userData.json', JSON.stringify(userData, null, 2));
        console.log("[+] Dane użytkowników zostały zapisane.");
    } catch (err) {
        console.error("[ERROR] Błąd przy zapisywaniu danych użytkowników:", err);
    }
}

// Funkcja do załadowania danych użytkowników z pliku
async function loadUserData() {
    try {
        const data = await fs.readFile('userData.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.log("[+] Brak danych użytkowników, plik nie istnieje.");
            return { members: [] }; // Brak danych - zwracamy pustą tablicę członków
        } else {
            console.error("[ERROR] Błąd przy parsowaniu danych z pliku:", err);
            return {}; // Zwracamy pusty obiekt, jeśli nie udało się sparsować danych
        }
    }
}

// Funkcja do pobrania nazwy użytkownika z wiadomości
const getUserName = async (last) => {
    try {
        const userName = await last.evaluate(node => {
            const row = node.closest('[role="row"]');
            const nameSpan = row?.querySelector('h5 span');
            return nameSpan?.innerText || "Nieznany Użytkownik";
        });
        return userName;
    } catch (e) {
        console.warn("[⚠️] Błąd przy pobieraniu nazwy użytkownika:", e.message);
        return "Nieznany Użytkownik";
    }
};

// Funkcja do załadowania nazw użytkowników i zapisania ich do pliku
async function updateUserNames(lastMessages) {
    const userData = await loadUserData();  // Pobieramy istniejące dane
    const newUserNames = [];

    for (let i = 0; i < lastMessages.length; i++) {
        const userName = await getUserName(lastMessages[i]);
        if (!userData.members.includes(userName)) {
            newUserNames.push(userName);
        }
    }

    if (newUserNames.length > 0) {
        const updatedData = { ...userData, members: [...userData.members, ...newUserNames] };

        // Zapisujemy tylko jeśli nastąpiła zmiana
        if (newUserNames.length > 0) {
            await saveUserData(updatedData);
        } else {
            console.log("[+] Brak nowych użytkowników do dodania.");
        }
    }
}

// Eksportujemy funkcje
module.exports = { getUserName, saveUserData, loadUserData, updateUserNames };
