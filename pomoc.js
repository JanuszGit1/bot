const { getUserName } = require('./userUtils');

const commandsList = [
    {
        command: '!prognoza <miasto>',
        description: 'Pobiera prognozę pogody dla podanego miasta. Przykład: `!prognoza Warszawa`',
        emoji: '🌤️'
    },
    {
        command: '!pogoda <miasto>',
        description: 'Pobiera bieżącą pogodę dla podanego miasta. Przykład: `!pogoda Kraków`',
        emoji: '🌧️'
    },
    {
        command: '!mem',
        description: 'Generuje losowy mem i wysyła go do grupy. Przykład: `!mem`',
        emoji: '😂'
    },
    {
        command: '!zasady <dodaj/usun/edytuj/pokaz>',
        description: 'Pozwala zarządzać zasadami w grupie. Przykład: `!zasady dodaj Nie spamuj`',
        emoji: '📜'
    },
    {
        command: '!ostrzeżenie <użytkownik>',
        description: 'Dodaje ostrzeżenie dla użytkownika, który złamał zasady. Przykład: `!ostrzeżenie JanKowalski`',
        emoji: '⚠️'
    },
    {
        command: '!czas',
        description: 'Pokazuje aktualną godzinę. Przykład: `!czas`',
        emoji: '⏰'
    },
    {
        command: '!kurs',
        description: 'Pobiera aktualny kurs walut. Przykład: `!kurs USD`',
        emoji: '💱'
    },
    {
        command: '!złoto',
        description: 'Pokazuje aktualną cenę złota. Przykład: `!złoto`',
        emoji: '💰'
    },
    {
        command: '!rzućkostką',
        description: 'Symuluje rzut kostką. Przykład: `!rzućkostką`',
        emoji: '🎲'
    },
    {
        command: '!historiakostki',
        description: 'Pokazuje historię rzutów kostką. Przykład: `!historiakostki`',
        emoji: '📜'
    },
    {
        command: '!zagadka <kategoria> <poziom>',
        description: 'Zadaje zagadkę. Przykład: `!zagadka 9 easy`',
        emoji: '🧠'
    },
    {
        command: '!odp <komenda> <odpowiedź>',
        description: 'Pozwala odpowiedzieć na zagadkę. Przykład: `!odp zagadka pies`',
        emoji: '✍️'
    },
    {
        command: '!historia',
        description: 'Zwraca dane historyczne. Przykład: `!historia`',
        emoji: '📈'
    },
    {
        command: '!para',
        description: 'Wyświetla kurs walutowy wybranej pary. Przykład: `!para USD/EUR`',
        emoji: '🔁'
    },
    {
        command: '!crypto',
        description: 'Pokazuje dane o kryptowalutach. Przykład: `!crypto BTC`',
        emoji: '📊'
    },
    {
        command: '!info',
        description: 'Wyświetla informacje o grupie oraz bocie.',
        emoji: 'ℹ️'
    },
    {
        command: '!pomoc',
        description: 'Wyświetla listę dostępnych komend.',
        emoji: '🛠️'
    },
    {
        command: '!żart',
        description: 'Wysyła losowy żart. Przykład: `!żart`',
        emoji: '🤣'
    },
    {
         command: '!losuj <opcja1,opcja2,...>',
         description: 'Losuje jedną z podanych opcji rozdzielonych przecinkiem. Przykład: `!losuj pizza, sushi, burger`',
         emoji: '🎯'
    },
    {
        command: '!rip <imię nazwisko YYYY-YYYY "cytat" przyczyna>',
        description: 'Tworzy nagrobek dla podanej osoby. Przykład: `!rip Jan Kowalski 1980-2023 "Zawsze był pierwszy w kolejce" powód: kac`',
        emoji: '⚰️'
    }
    ];

async function getHelpMessage(last) {
    let userName = "nieznany";
    try {
        userName = await getUserName(last);
    } catch (err) {
        console.warn("[⚠️] Błąd przy pobieraniu nazwy użytkownika:", err.message);
    }

    let helpMessage = `🛠️ **Dostępne komendy bota**\n\n`;
    helpMessage += `🔹 **Witaj, ${userName}! Oto wszystkie komendy, które możesz wykorzystać, aby rozmawiać z botem.**\n\n`;

    commandsList.forEach(cmd => {
        helpMessage += `🔸 **${cmd.emoji} ${cmd.command}**\n`;
        helpMessage += `   _${cmd.description}_\n\n`;
    });

    helpMessage += `💬 **Więcej informacji?** Jeśli nie wiesz, jak używać danej komendy, zawsze możesz zapytać o pomoc za pomocą: \`!pomoc\`\n`;

    const easterEggs = [
        '🐱‍👤 Pssst... Wpisz `!kot` i zobacz, co się stanie... 😺',
        '🕵️‍♂️ Wiesz, że bot potajemnie śledzi liczbę ostrzeżeń? 👀',
        '🎲 Komenda `!los`... hmmm... może coś losowego?',
        '📦 W planach jest komenda `!pacman` — stay tuned! 🎮',
        '💡 TIP: Komendy działają lepiej, gdy nie krzyczysz na bota 😅'
    ];
    const randomEgg = easterEggs[Math.floor(Math.random() * easterEggs.length)];
    helpMessage += `\n🔍 ${randomEgg}\n`;

    helpMessage += `\n🤖 **Bot jest tutaj, aby pomóc Ci w każdej sytuacji!** 💡`;

    return helpMessage;
}

module.exports = { getHelpMessage };
