const fs = require('fs').promises;
const path = require('path');

const warningsPath = path.join(__dirname, 'uwagi.json');
const usersPath = path.join(__dirname, 'data.json');

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function loadWarnings() {
    if (!await fileExists(warningsPath)) return {};
    try {
        const data = await fs.readFile(warningsPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("[ERROR] Błąd przy ładowaniu ostrzeżeń:", err);
        return {};
    }
}

async function saveWarnings(data) {
    try {
        await fs.writeFile(warningsPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error("[ERROR] Błąd przy zapisie ostrzeżeń:", err);
    }
}

async function loadUsers() {
    if (!await fileExists(usersPath)) return { members: [] };
    try {
        const data = await fs.readFile(usersPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("[ERROR] Błąd przy ładowaniu użytkowników:", err);
        return { members: [] };
    }
}

function parseTimeString(timeStr) {
    const regex = /(\d+)\s*(d|h|m|s)/g;
    let match, ms = 0;
    while ((match = regex.exec(timeStr)) !== null) {
        const [, value, unit] = match;
        const n = parseInt(value);
        switch (unit) {
            case 'd': ms += n * 86400000; break;
            case 'h': ms += n * 3600000; break;
            case 'm': ms += n * 60000; break;
            case 's': ms += n * 1000; break;
        }
    }
    return ms;
}

function extractUser(command) {
    const match = command.match(/@([^\s]+(?:\s[^\s]+)?)/);
    return match ? match[1].trim() : null;
}

async function addWarning(user, reason, timeStr = "1d", issuer = "Admin") {
    user = user.replace('@', '');
    const users = (await loadUsers()).members;
    if (!users.includes(user)) return `❌ Użytkownik "${user}" nie istnieje w data.json`;

    const warnings = await loadWarnings();
    const now = Date.now();
    const expiresAt = now + parseTimeString(timeStr);

    if (!warnings[user]) warnings[user] = [];
    warnings[user].push({
        reason,
        date: now,
        expiresAt,
        issuedBy: issuer.replace('@', ''),
        issuedAt: now
    });

    const count = warnings[user].length;
    if (count === 5) {
        const deleteAt = now + 3600000;
        warnings[user].push({
            reason: "__OSTATECZNE__",
            date: now,
            expiresAt,
            deleteAt,
            issuedBy: "Bot",
            issuedAt: now
        });
        await saveWarnings(warnings);
        return `❌ ${user} otrzymał 5/5 ostrzeżeń!\n⚠️ Zostanie usunięty z grupy za 1 godzinę! (${new Date(deleteAt).toLocaleString()})`;
    }

    await saveWarnings(warnings);
    return `⚠️ Ostrzeżenie #${count} dla ${user} za: "${reason}". Wygasa: ${new Date(expiresAt).toLocaleString()}`;
}

async function removeWarning(user, index) {
    user = user.replace('@', '');
    const warnings = await loadWarnings();
    if (!warnings[user]) return `ℹ️ Użytkownik ${user} nie ma ostrzeżeń.`;
    if (index < 0 || index >= warnings[user].length) return `❌ Ostrzeżenie nr ${index + 1} dla ${user} nie istnieje.`;

    warnings[user].splice(index, 1);
    await saveWarnings(warnings);
    return `✅ Ostrzeżenie nr ${index + 1} dla ${user} zostało usunięte.`;
}

async function checkForExpiredKicks() {
    const warnings = await loadWarnings();
    const now = Date.now();
    const kicked = [];

    for (const user in warnings) {
        const kick = warnings[user].find(w => w.deleteAt && now >= w.deleteAt);
        if (kick) {
            delete warnings[user];
            kicked.push(user);
        }
    }

    if (kicked.length) await saveWarnings(warnings);
    return kicked;
}

async function showUserWarnings(user) {
    user = user.replace('@', '');
    const warnings = await loadWarnings();
    if (!warnings[user] || !warnings[user].length) return `✅ ${user} nie ma żadnych ostrzeżeń.`;

    const active = warnings[user].filter(w => !w.deleteAt);
    if (!active.length) return `✅ ${user} nie ma aktywnych ostrzeżeń.`;

    let out = `📋 Ostrzeżenia dla ${user} (${active.length}/5):\n`;
    active.forEach((w, i) => {
        out += `   #${i + 1}\n`;
        out += `   • 📝 Powód: "${w.reason}"\n`;
        out += `   • 👮 Dodał: ${w.issuedBy || "Nieznany"}\n`;
        out += `   • 📆 Dodano: ${new Date(w.issuedAt).toLocaleString()}\n`;
        out += `   • ⏳ Wygasa: ${new Date(w.expiresAt).toLocaleString()}\n\n`;
    });

    return out.trim();
}

async function showAllWarnings() {
    const warnings = await loadWarnings();
    const users = Object.keys(warnings);
    if (!users.length) return "✅ Nikt nie ma ostrzeżeń.";

    let out = "📋 Ostrzeżenia wszystkich użytkowników:\n";
    for (const user of users) {
        const active = warnings[user].filter(w => !w.deleteAt);
        if (!active.length) continue;

        out += `\n👤 ${user} (${active.length}/5):\n`;
        active.forEach((w, i) => {
            out += `   #${i + 1}\n`;
            out += `   • 📝 Powód: "${w.reason}"\n`;
            out += `   • 👮 Dodał: ${w.issuedBy || "Nieznany"}\n`;
            out += `   • 📆 Dodano: ${new Date(w.issuedAt).toLocaleString()}\n`;
            out += `   • ⏳ Wygasa: ${new Date(w.expiresAt).toLocaleString()}\n\n`;
        });
    }

    return out.trim();
}

async function listWarningsDetailed(command) {
    const cmd = command.toLowerCase();
    const user = extractUser(command);

    if (cmd.includes("lista") && !user) {
        return await showAllWarnings();
    }

    if (user) {
        return await showUserWarnings(user);
    }

    return "❌ Nie rozpoznano komendy.";
}

async function runCommand(command, issuer = 'Admin') {
    const cmd = command.toLowerCase();
    const user = extractUser(command);
    const cleanIssuer = issuer.replace('@', '');

    if (cmd.includes("dodaj")) {
        if (!user) return "❌ Nie podano użytkownika. Użyj @nazwa_uzytkownika";
        const reason = (command.match(/dodaj\s+(.+?)(\s+czas=|$)/i) || [])[1]?.trim() || "Brak powodu";
        const time = (command.match(/czas=([0-9dhms\s]+)/i) || [])[1]?.trim() || "1d";
        return await addWarning(user, reason, time, cleanIssuer);
    }

    if (cmd.includes("usuń")) {
        if (!user) return "❌ Nie podano użytkownika. Użyj @nazwa_uzytkownika";
        const index = parseInt((command.match(/usuń\s+(\d+)/i) || [])[1]) - 1;
        return await removeWarning(user, isNaN(index) ? 0 : index);
    }

    if (cmd.includes("lista")) {
        return await listWarningsDetailed(command);
    }

    if (cmd.includes("wszystkich")) {
        return await showAllWarnings();
    }

    return "❌ Nieznana komenda ostrzeżenia.";
}

module.exports = { runCommand, checkForExpiredKicks };
