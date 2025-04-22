const fs = require('fs');
const path = './data.json';

function loadUsersFromFile() {
    const filePath = path;
    
    if (!fs.existsSync(filePath)) {
        console.log("[ERROR] Plik data.json nie istnieje.");
        // Tworzymy pusty plik, jeśli go nie ma
        fs.writeFileSync(filePath, JSON.stringify({ members: [] }));
        return [];
    }
    
    let data;
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (err) {
        console.error("[ERROR] Błąd podczas odczytu lub parsowania data.json:", err);
        return [];
    }

    // Upewnienie się, że dane zawierają 'members' przed ich zwróceniem
    if (!data.members || !Array.isArray(data.members)) {
        console.error("[ERROR] Plik data.json zawiera nieprawidłowe dane!");
        return [];
    }

    return data.members;
}

// Funkcja do generowania losowej pary użytkowników
function getRandomPair(users) {
    if (users.length < 2) {
        console.log("[ERROR] Za mało użytkowników do losowania pary.");
        return [];
    }

    const randomIndex1 = Math.floor(Math.random() * users.length);
    let randomIndex2 = Math.floor(Math.random() * users.length);

    // Upewniamy się, że wybrany indeks 2 jest inny niż indeks 1
    while (randomIndex1 === randomIndex2) {
        randomIndex2 = Math.floor(Math.random() * users.length);
    }

    return [users[randomIndex1], users[randomIndex2]];
}

// Funkcja do generowania procentu dopasowania między dwoma użytkownikami
function getMatchPercentage() {
    return Math.floor(Math.random() * 100);  // Losowy procent od 0 do 100
}

// Funkcja generująca nazwę statku (ship name) na podstawie imion użytkowników
function generateShipName(person1, person2) {
    // Walidacja, aby upewnić się, że imiona są prawidłowe
    if (typeof person1 !== 'string' || typeof person2 !== 'string' || !person1 || !person2) {
        console.error("[ERROR] Imiona muszą być typu string i nie mogą być puste!");
        return null;  // Jeśli imiona są nieprawidłowe, zwróć null
    }

    const name1 = person1.charAt(0).toUpperCase() + person1.slice(1).toLowerCase();
    const name2 = person2.charAt(0).toUpperCase() + person2.slice(1).toLowerCase();

    const adjectives = ["Starry", "Mystic", "Silent", "Cosmic", "Fierce", "Majestic", "Electric", "Ethereal", "Luminous", "Celestial"];
    const animals = ["Eagle", "Lion", "Dragon", "Phoenix", "Wolf", "Tiger", "Jaguar", "Bear", "Hawk", "Leopard"];

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];

    return `${randomAdjective}${name1}${name2}${randomAnimal}`;
}

// Wczytanie listy użytkowników z pliku data.json
const allUsers = loadUsersFromFile();

if (allUsers.length >= 2) {
    const [user1, user2] = getRandomPair(allUsers);
    const matchPercentage = getMatchPercentage();
    const shipName = generateShipName(user1, user2);

    if (shipName) {  // Tylko jeśli nazwa statku została poprawnie wygenerowana
        console.log(`[🎉] Losowa para: ${user1} & ${user2}`);
        console.log(`[❤️] Procent dopasowania: ${matchPercentage}%`);
        console.log(`[🚢] Nazwa statku: ${shipName}`);
    } else {
        console.log("[ERROR] Błąd przy generowaniu nazwy statku.");
    }
} else {
    console.log("[ERROR] Za mało użytkowników w grupie do losowania.");
}

// Eksport funkcji do użycia w innych plikach
module.exports = {
    loadUsersFromFile,
    getRandomPair,
    getMatchPercentage,
    generateShipName
};
