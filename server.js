// Haircraft Barber — bağımlılıksız Node sunucusu (statik dosyalar + randevu API + Telegram)
const http = require("http"), fs = require("fs"), path = require("path");

// .env yükle (token yalnızca sunucuda kalır)
try {
  for (const l of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const PORT = process.env.PORT || 3000;
const DB = path.join(__dirname, "data", "appointments.json");
const SERVICES = ["Saç Kesimi", "Saç + Sakal", "Sakal Kesimi", "Damat Tıraşı"];
const BRANCHES = ["Çerkezköy", "Kapaklı"];
const BARBERS = ["Adem Gezer", "Uğurcan Şefil", "Enes", "Ensar Gezer", "Şahin İstek", "Enes Soylu"];
const HAIRSTYLES = ["Textured Crop", "Low Taper Fade", "Mid Skin Fade", "Classic Slick Back", "Modern Quiff", "Messy Fringe", "Buzz Cut", "Pompadour"];
const SLOTS = []; for (let h = 9; h < 21; h++) SLOTS.push(`${String(h).padStart(2,"0")}:00`, `${String(h).padStart(2,"0")}:30`);
const PUBLIC = new Set(["index.html","style.css","enhance.css","script.js","enhance.js"]);
const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8",
  ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png", ".webp":"image/webp", ".svg":"image/svg+xml" };

const readDb = () => { try { return JSON.parse(fs.readFileSync(DB, "utf8")); } catch { return []; } };
const writeDb = (rows) => { fs.mkdirSync(path.dirname(DB), { recursive: true }); fs.writeFileSync(DB, JSON.stringify(rows, null, 2)); };
const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); };
const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

// Basit IP başına hız sınırı: 10 dakikada 5 istek
const hits = new Map();
function limited(ip) {
  const now = Date.now(), arr = (hits.get(ip) || []).filter(t => now - t < 600000);
  arr.push(now); hits.set(ip, arr); return arr.length > 5;
}

function validate(b) {
  const name = String(b.name || b.customerName || "").trim().replace(/\s+/g, " ");
  const phone = String(b.phone || b.customerPhone || "").trim();
  const digits = phone.replace(/\D/g, "");
  const service = String(b.service || "").trim();
  const branch = String(b.branch || "").trim();
  const barber = String(b.barber || "").trim();
  const hairstyle = String(b.hairstyle || "").trim();
  const date = String(b.date || b.appointmentDate || "").trim();
  const time = String(b.time || b.appointmentTime || "").trim();
  if (b.website) return { error: "Geçersiz istek." };
  if (!SERVICES.includes(service)) return { error: "Lütfen bir hizmet seçin." };
  if (!BRANCHES.includes(branch)) return { error: "Lütfen bir şube seçin." };
  if (barber && barber !== "Fark etmez" && !BARBERS.includes(barber)) return { error: "Geçersiz berber seçimi." };
  if (hairstyle && !HAIRSTYLES.includes(hairstyle)) return { error: "Geçersiz stil seçimi." };
  if (name.length < 2 || name.length > 60) return { error: "Lütfen adınızı ve soyadınızı girin." };
  if (digits.length < 10 || digits.length > 13 || phone.length > 20) return { error: "Lütfen geçerli bir telefon numarası girin." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Geçerli bir tarih seçin." };
  const selectedDate = new Date(date + "T00:00:00");
  if (Number.isNaN(selectedDate.getTime()) || selectedDate.toISOString().slice(0, 10) !== date) return { error: "Geçerli bir tarih seçin." };
  if (selectedDate.getDay() === 0) return { error: "Pazar günü salonumuz kapalıdır." };
  if (!SLOTS.includes(time)) return { error: "Geçerli bir saat seçin." };
  const now = new Date();
  if (date < ymd(now) || (date === ymd(now) && time <= now.toTimeString().slice(0, 5))) return { error: "Geçmiş bir zaman seçemezsiniz." };
  return { data: { service, branch, barber: barber || "Fark etmez", hairstyle, date, time, name, phone } };
}

async function notifyTelegram(a) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat || token.startsWith("YOUR_")) { console.warn("[telegram] atlandı: env değişkenleri tanımlı değil"); return; }
  const day = new Intl.DateTimeFormat("tr-TR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" }).format(new Date(a.date + "T00:00:00"));
  const text = ["━━━━━━━━━━━━━━━━","🔔 <b>YENİ RANDEVU</b>","━━━━━━━━━━━━━━━━","",
    `👤 <b>Müşteri:</b>\n${esc(a.name)}`, `📞 <b>Telefon:</b>\n${esc(a.phone)}`, `📍 <b>Şube:</b>\n${esc(a.branch)}`, `💈 <b>Hizmet:</b>\n${esc(a.service)}`, `💇 <b>Stil:</b>\n${esc(a.hairstyle || "Belirtilmedi")}`,
    `✂️ <b>Berber:</b>\n${esc(a.barber || "Fark etmez")}`, `📅 <b>Tarih:</b>\n${esc(day)}`, `⏰ <b>Saat:</b>\n${esc(a.time)}`,
    "","━━━━━━━━━━━━━━━━","🌐 Web Sitesi Randevusu","━━━━━━━━━━━━━━━━"].join("\n");
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML" }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) console.error("[telegram] gönderilemedi, HTTP", r.status);   // token loglanmaz
  } catch (e) { console.error("[telegram] hata:", e.name); }
}

async function handleApi(req, res, url) {
  const ip = req.socket.remoteAddress || "";
  if (req.method === "GET" && url.pathname === "/api/slots") {
    const date = url.searchParams.get("date"), barber = url.searchParams.get("barber") || "";
    const taken = readDb().filter(r => r.date === date && barber && r.barber === barber).map(r => r.time);
    return send(res, 200, { taken });
  }
  if (req.method === "POST" && url.pathname === "/api/appointments") {
    if (limited(ip)) return send(res, 429, { error: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." });
    let raw = ""; for await (const c of req) { raw += c; if (raw.length > 10000) return send(res, 413, { error: "İstek çok büyük." }); }
    let body; try { body = JSON.parse(raw); } catch { return send(res, 400, { error: "Geçersiz istek." }); }
    const v = validate(body || {});
    if (v.error) return send(res, 400, { error: v.error });
    const a = v.data, rows = readDb();
    if (a.barber && rows.some(r => r.date === a.date && r.time === a.time && r.branch === a.branch && r.barber === a.barber))
      return send(res, 409, { error: "Bu saat dolu. Lütfen başka bir saat seçin." });
    writeDb([...rows, { id: Date.now().toString(36), ...a, createdAt: new Date().toISOString() }]);
    send(res, 201, { ok: true });          // kayıt başarılı → kullanıcıya hemen yanıt
    notifyTelegram(a);                      // Telegram sonucu kullanıcı yanıtını etkilemez
    return;
  }
  send(res, 404, { error: "Bulunamadı." });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url).catch(e => { console.error("[api]", e.message); send(res, 500, { error: "Sunucu hatası." }); });
  let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  if (!PUBLIC.has(rel) && !/^images\/[\w.-]+$/.test(rel)) { res.writeHead(404); return res.end("Not found"); }
  fs.readFile(path.join(__dirname, rel), (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(rel)] || "application/octet-stream" }); res.end(buf);
  });
}).listen(PORT, () => console.log(`Haircraft Barber → http://localhost:${PORT}`));
