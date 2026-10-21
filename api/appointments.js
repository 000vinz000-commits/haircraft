const ALLOWED_ORIGINS = new Set([
  "https://haircraft-theta.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000"
]);

const SERVICES = new Set([
  "Saç Kesimi",
  "Saç + Sakal",
  "Sakal Kesimi",
  "Damat Tıraşı"
]);

const BRANCHES = new Set(["Çerkezköy", "Kapaklı"]);
const BARBERS = new Set([
  "Adem Gezer",
  "Uğurcan Şefil",
  "Enes",
  "Ensar Gezer",
  "Şahin İstek",
  "Enes Soylu"
]);
const HAIRSTYLES = new Set([
  "Textured Crop",
  "Low Taper Fade",
  "Mid Skin Fade",
  "Classic Slick Back",
  "Modern Quiff",
  "Messy Fringe",
  "Buzz Cut",
  "Pompadour"
]);
const TIME_SLOTS = new Set([
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30"
]);

const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 600;
const localHits = new Map();

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) return false;

  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return true;
}

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

function localRateLimit(key) {
  const now = Date.now();
  const active = (localHits.get(key) || []).filter((time) => now - time < RATE_WINDOW_SECONDS * 1000);
  active.push(now);
  localHits.set(key, active);
  return {
    limited: active.length > RATE_LIMIT,
    distributed: false
  };
}

async function rateLimit(req) {
  const key = clientKey(req);
  const redisUrl = String(process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Vercel instance belleği global değildir; Upstash tanımlıysa tüm instance'lar ortak sayaç kullanır.
  if (!redisUrl || !redisToken) {
    return process.env.VERCEL === "1"
      ? { limited: false, unavailable: true, distributed: false }
      : localRateLimit(key);
  }

  const redisKey = `haircraft:appointment-rate:${key.slice(0, 120)}`;
  try {
    const incrementResponse = await fetch(`${redisUrl}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify([{ command: ["INCR", redisKey] }])
    });

    if (!incrementResponse.ok) throw new Error("rate-limit-store-unavailable");
    const incrementData = await incrementResponse.json();
    const count = Number(incrementData?.[0]?.result);
    if (!Number.isFinite(count)) throw new Error("rate-limit-store-invalid-response");

    if (count === 1) {
      const expiryResponse = await fetch(`${redisUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redisToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([{ command: ["EXPIRE", redisKey, String(RATE_WINDOW_SECONDS)] }])
      });
      if (!expiryResponse.ok) throw new Error("rate-limit-expiry-failed");
    }

    return { limited: count > RATE_LIMIT, distributed: true };
  } catch {
    if (process.env.VERCEL === "1") {
      return { limited: false, unavailable: true, distributed: false };
    }
    return localRateLimit(key);
  }
}

function clean(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
}

function isPastDateTime(date, time) {
  const selected = new Date(`${date}T${time}:00`);
  return selected.getTime() < Date.now();
}

function validate(body) {
  const name = clean(body.name ?? body.customerName);
  const phone = clean(body.phone ?? body.customerPhone);
  const service = clean(body.service);
  const branch = clean(body.branch);
  const barber = clean(body.barber);
  const hairstyle = clean(body.hairstyle);
  const date = clean(body.date ?? body.appointmentDate);
  const time = clean(body.time ?? body.appointmentTime);
  const phoneDigits = phone.replace(/\D/g, "");

  if (body.website) return { error: "Geçersiz istek." };
  if (name.length < 2 || name.length > 60 || !phone || phone.length > 20 || phoneDigits.length < 10 || phoneDigits.length > 13) {
    return { error: "Lütfen geçerli ad ve telefon bilgilerini girin." };
  }
  if (service.length > 40 || branch.length > 40 || barber.length > 60 || hairstyle.length > 60) {
    return { error: "Form alanlarından biri çok uzun." };
  }
  if (!SERVICES.has(service)) return { error: "Geçerli bir hizmet seçin." };
  if (!BRANCHES.has(branch)) return { error: "Geçerli bir şube seçin." };
  if (barber && barber !== "Fark etmez" && !BARBERS.has(barber)) return { error: "Geçerli bir berber seçin." };
  if (hairstyle && !HAIRSTYLES.has(hairstyle)) return { error: "Geçerli bir stil seçin." };
  if (!isValidDate(date)) return { error: "Geçerli bir tarih seçin." };

  const selectedDate = new Date(`${date}T00:00:00`);
  if (selectedDate.getDay() === 0) return { error: "Pazar günü salonumuz kapalıdır." };
  if (!TIME_SLOTS.has(time) || isPastDateTime(date, time)) {
    return { error: "Geçerli ve ileri bir saat seçin." };
  }

  return {
    data: {
      name,
      phone,
      service,
      branch,
      barber: barber || "Fark etmez",
      hairstyle,
      date,
      time
    }
  };
}

async function notifyTelegram(appointment) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId || token.startsWith("YOUR_")) return;

  const message = [
    "💈 YENİ RANDEVU TALEBİ!",
    "",
    `👤 Müşteri: ${appointment.name}`,
    `📞 Telefon: ${appointment.phone}`,
    `📍 Şube: ${appointment.branch}`,
    `✂️ Hizmet: ${appointment.service}`,
    `💇 Stil: ${appointment.hairstyle || "Belirtilmedi"}`,
    `👨‍🦰 Berber: ${appointment.barber}`,
    `📅 Tarih: ${appointment.date}`,
    `⏰ Saat: ${appointment.time}`
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    // Telegram sonucu istemciye hassas hata ayrıntılarıyla açılmaz.
  }
}

module.exports = async function handler(req, res) {
  if (!setCors(req, res)) {
    return res.status(403).json({ success: false, message: "Bu origin için istek izni yok." });
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Yalnızca POST istekleri kabul edilir." });
  }

  const limit = await rateLimit(req);
  if (limit.unavailable) {
    return res.status(503).json({
      success: false,
      message: "Randevu servisi şu anda yapılandırılıyor. Lütfen daha sonra tekrar deneyin."
    });
  }
  res.setHeader("X-RateLimit-Policy", limit.distributed ? "upstash-shared" : "instance-best-effort");
  if (limit.limited) {
    res.setHeader("Retry-After", String(RATE_WINDOW_SECONDS));
    return res.status(429).json({ success: false, message: "Çok fazla deneme. Lütfen biraz sonra tekrar deneyin." });
  }

  try {
    const contentLength = Number(req.headers["content-length"] || 0);
    if (contentLength > 10000) {
      return res.status(413).json({ success: false, message: "İstek çok büyük." });
    }

    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const result = validate(body || {});
    if (result.error) return res.status(400).json({ success: false, message: result.error });

    await notifyTelegram(result.data);
    return res.status(200).json({
      success: true,
      message: "Randevu talebiniz işletmeye iletildi. Kesin onay için şube sizinle iletişime geçecektir."
    });
  } catch {
    return res.status(500).json({ success: false, message: "İstek işlenemedi. Lütfen tekrar deneyin." });
  }
};
