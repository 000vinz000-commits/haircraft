module.exports = async function handler(req, res) {
  // CORS Başlıkları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Yalnızca POST istekleri kabul edilir.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }

    const { name, phone, service, barber, date, time } = body || {};

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Lütfen ad ve telefon bilgilerini doldurun.' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Vercel ortam değişkenleri (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) okunamadı.' 
      });
    }

    // Düz metin mesajı (Markdown hatası riskini sıfırladık)
    const message = 
`💈 YENİ RANDEVU TALEBİ!

👤 Müşteri: ${name}
📞 Telefon: ${phone}
✂️ Hizmet: ${service || 'Belirtilmedi'}
👨‍🺰 Berber: ${barber || 'Farketmez'}
📅 Tarih: ${date || 'Belirtilmedi'}
⏰ Saat: ${time || 'Belirtilmedi'}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    });

    const tgData = await tgRes.json().catch(() => ({}));

    if (!tgRes.ok) {
      console.error('Telegram API Error:', tgData);
      return res.status(500).json({ 
        success: false, 
        message: `Telegram Hatası (${tgRes.status}): ${tgData.description || 'Mesaj gönderilemedi.'}` 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Randevunuz başarıyla oluşturuldu!' 
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Sunucu Hatası: ${error.message || 'Bilinmeyen hata'}` 
    });
  }
};
