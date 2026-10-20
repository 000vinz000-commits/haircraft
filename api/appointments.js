export default async function handler(req, res) {
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
    const { name, phone, service, barber, date, time } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Lütfen ad ve telefon bilgilerini doldurun.' });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;8986949547:AAEZx_UMFv2WZp_i3DrH5NeI6zhqjOkYHWM
    const chatId = process.env.TELEGRAM_CHAT_ID;-5416001079

    // Telegram Bildirim Mesajı
    const message = 
`💈 *YENİ RANDEVU TALEBİ!*

👤 *Müşteri:* ${name}
📞 *Telefon:* ${phone}
✂️ *Hizmet:* ${service || 'Belirtilmedi'}
👨‍🺰 *Berber:* ${barber || 'Farketmez'}
📅 *Tarih:* ${date || 'Belirtilmedi'}
⏰ *Saat:* ${time || 'Belirtilmedi'}`;

    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Randevunuz başarıyla oluşturuldu ve berberinize iletildi!' 
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  }
}
