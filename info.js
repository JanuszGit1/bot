const os = require('os');
const { version } = require('./package.json');
const { execSync } = require('child_process');
const fs = require('fs'); // Importujemy fs do pracy z plikami

const botName = "Botek";
const authorName = "Stanisław Mordarski";

// Główna funkcja do generowania wiadomości informacyjnej o grupie i bocie
async function getGroupInfo() {
    const groupName = await getGroupName();
    const groupDescription = await getGroupDescription();
    const numberOfMembers = await getNumberOfMembers();  // Teraz ta funkcja pobiera liczbę z pliku

    const botUptime = formatUptime(process.uptime());
    const currentServerTime = new Date().toLocaleString();
    const systemStats = getSystemStats();
    const randomFact = getRandomFact();

    let infoMessage = `📝 **Informacje o grupie i bocie**\n`;
    infoMessage += `\n**Nazwa grupy**: ${groupName}`;
    infoMessage += `\n**Liczba członków**: ${numberOfMembers}`;
    infoMessage += `\n**Czas działania bota**: ${botUptime}`;
    infoMessage += `\n**Nazwa bota**: ${botName}`;
    infoMessage += `\n**Wersja**: ${version}`;
    infoMessage += `\n**Autor**: ${authorName}`;
    infoMessage += `\n\n**Aktualny czas serwera**: ${currentServerTime}`;

    infoMessage += `\n\n**📊 Statystyki systemowe**:`;
    infoMessage += `\n• System operacyjny: ${systemStats.os}`;
    infoMessage += `\n• Architektura: ${systemStats.arch}`;
    infoMessage += `\n• CPU: ${systemStats.cpuUsage}%`;
    infoMessage += `\n• RAM: ${systemStats.memoryUsage}%`;
    infoMessage += `\n• Wolna pamięć: ${systemStats.freeMemory} MB`;

    infoMessage += `\n\n💡 **Ciekawostka**: ${randomFact}`;

    return infoMessage;
}

// Pomocnicza funkcja do formatowania czasu działania
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}

// Pobieranie informacji o systemie
function getSystemStats() {
    const cpuUsage = Math.round((os.loadavg()[0] / os.cpus().length) * 100);
    const memoryUsage = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
    const freeMemory = Math.round(os.freemem() / (1024 * 1024));
    return {
        os: `${os.platform()} ${os.release()}`,
        arch: os.arch(),
        cpuUsage,
        memoryUsage,
        freeMemory
    };
}

// Dynamiczne dane o grupie – tutaj można podłączyć API / bazę danych
async function getGroupName() {
    return "CHATGPT";
}

async function getGroupDescription() {
    return "Grupa przeznaczona do dyskusji o sztucznej inteligencji.";
}

async function getGroupCreatedDate() {
    return "2023-01-01";
}

// Funkcja do pobierania liczby członków z pliku data.json
async function getNumberOfMembers() {
    try {
        // Wczytanie pliku data.json
        const data = fs.readFileSync('./data.json', 'utf8');
        const parsedData = JSON.parse(data);

        // Liczenie liczby użytkowników w tablicy members
        const numberOfMembers = parsedData.members ? parsedData.members.length : 0;

        return numberOfMembers;
    } catch (error) {
        console.error("❌ Błąd odczytu pliku data.json:", error);
        return 0;  // Jeśli błąd, zwróci 0
    }
}

// Losowa ciekawostka
function getRandomFact() {
    const facts = [
        "Bot działa 24/7 i nigdy nie śpi!",
        "Grupa powstała dla entuzjastów AI – takich jak Ty.",
        "Wpisz !mem aby rozśmieszyć całą grupę.",
        "Komenda !pogoda pokaże Ci, co ubrać dziś rano."
    ];
    return facts[Math.floor(Math.random() * facts.length)];
}

module.exports = { getGroupInfo };
