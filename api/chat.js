export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Sadece POST istekleri kabul edilir.' });
    }

    const { prompt, systemInstruction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY sunucuda tanımlanmamış.' });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: prompt }]
                        }
                    ],
                    systemInstruction: {
                        parts: [{ text: systemInstruction || "Sen Tuana'nın İngilizce ve Yazılım öğrenim asistanısın. Kısa, motive edici ve açıklayıcı yanıtlar ver." }]
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Gemini API hatası.' });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";
        return res.status(200).json({ reply });

    } catch (err) {
        return res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
}