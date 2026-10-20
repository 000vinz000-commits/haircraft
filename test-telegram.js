// Telegram test: server.js ile AYNI klasöre koyun, çalıştırın: node test-telegram.js
const fs = require("fs"), path = require("path");
const envPath = path.join(__dirname, ".env");
console.log("1) .env dosyası:", fs.existsSync(envPath) ? "BULUNDU" : "BULUNAMADI -> " + envPath);
if (!fs.existsSync(envPath)) process.exit(1);

const env = {};
for (const l of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const token = env.TELEGRAM_BOT_TOKEN, chat = env.TELEGRAM_CHAT_ID;
console.log("2) TOKEN:", token ? `dolu (${token.length} karakter)` : "BOŞ", "| CHAT_ID:", chat ? `dolu (${chat})` : "BOŞ");
if (!token || !chat) process.exit(1);
if (!/^\d+:[\w-]{30,}$/.test(token)) console.log("   UYARI: token formatı garip görünüyor (123456789:AA... şeklinde olmalı, boşluk/fazla karakter olmamalı)");

(async () => {
  try {
    const me = await (await fetch(`https://api.telegram.org/bot${token}/getMe`)).json();
    console.log("3) Token kontrolü:", me.ok ? `GEÇERLİ -> bot: @${me.result.username}` : `HATA -> ${me.description}`);
    if (!me.ok) return;
    const r = await (await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: "✅ Test mesajı — Haircraft Barber" })
    })).json();
    console.log("4) Mesaj gönderimi:", r.ok ? "BAŞARILI (Telegram'ı kontrol edin)" : `HATA -> ${r.description}`);
    if (!r.ok) {
      const u = await (await fetch(`https://api.telegram.org/bot${token}/getUpdates`)).json();
      const chats = new Map();
      for (const x of u.result || []) { const c = (x.message || x.channel_post || x.my_chat_member || {}).chat; if (c) chats.set(c.id, c.title || c.first_name || c.username || ""); }
      if (!chats.size) console.log("5) Bota yazılmış hiç mesaj yok. Telegram'da @" + me.result.username + " botunu açıp Başlat/Start'a basın, sonra bu scripti tekrar çalıştırın.");
      else { console.log("5) Botun gördüğü sohbetler (.env'deki TELEGRAM_CHAT_ID yerine BİRİNİ yazın):"); for (const [id, n] of chats) console.log("   ", id, n); }
    }
  } catch (e) {
    console.log("Bağlantı hatası (internet/güvenlik duvarı/VPN?):", e.message);
  }
})();