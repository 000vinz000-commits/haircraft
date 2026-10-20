
export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Sadece POST isteği kabul edilir."
    });
  }

  return res.status(501).json({
    error: "Randevu kayıt sistemi henüz yapılandırılmadı."
  });
}

