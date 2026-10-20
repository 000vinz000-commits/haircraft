
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  const {
    service,
    barber,
    date,
    time,
    customerName,
    customerPhone
  } = req.body || {};

  if (
    !service ||
    !barber ||
    !date ||
    !time ||
    !customerName ||
    !customerPhone
  ) {
    return res.status(400).json({
      error: "Lütfen tüm randevu alanlarını doldurun."
    });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({
      error: "Telegram ayarları eksik."
    });
  }

  try {
    const message = [
      "💈 YENİ RANDEVU TALEBİ",
      "",
      `Hizmet: ${service}`,
      `Berber: ${barber}`,
      `Tarih: ${date}`,
      `Saat: ${time}`,
      `Müşteri: ${customerName}`,
      `Telefon: ${customerPhone}`
    ].join("\n");

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return res.status(502).json({
        error: "Telegram bildirimi gönderilemedi."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Randevu talebi Telegram grubuna iletildi."
    });
  } catch {
    return res.status(500).json({
      error: "İşlem sırasında bir hata oluştu."
    });
  }
}
