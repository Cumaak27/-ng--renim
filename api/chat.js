
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            error: "Sadece POST istekleri kabul edilir."
        });
    }

    const { prompt, systemInstruction } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: "GEMINI_API_KEY Vercel ortam değişkenlerinde tanımlı değil."
        });
    }

    if (typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({
            error: "Lütfen bir soru yaz."
        });
    }

    const model = "gemini-3.8-flash";
    const maxAttempts = 3;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-goog-api-key": apiKey
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [{ text: prompt.trim() }]
                            }
                        ],
                        systemInstruction: {
                            parts: [{
                                text: typeof systemInstruction === "string"
                                    ? systemInstruction
                                    : "Sen Rafık'ın İngilizce ve yazılım öğrenim asistanısın. Türkçe, kısa, motive edici ve açıklayıcı yanıtlar ver."
                            }]
                        },
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 2048
                        }
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {
                const reply = data.candidates?.[0]?.content?.parts
                    ?.map(part => part.text || "")
                    .join("")
                    .trim();

                if (!reply) {
                    return res.status(502).json({
                        error: "Model boş yanıt döndürdü. Lütfen tekrar dene."
                    });
                }

                return res.status(200).json({ reply });
            }

            const retryable = [429, 500, 502, 503, 504].includes(
                response.status
            );

            if (!retryable || attempt === maxAttempts - 1) {
                console.error("Gemini API hatası:", response.status, data);

                return res.status(response.status).json({
                    error: data.error?.message ||
                        "Gemini API isteği başarısız oldu."
                });
            }

            // Geçici hatalarda 1, ardından 2 saniye bekle.
            await new Promise(resolve =>
                setTimeout(resolve, 1000 * (attempt + 1))
            );

        } catch (error) {
            console.error("Sunucu hatası:", error);

            if (attempt === maxAttempts - 1) {
                return res.status(500).json({
                    error: "Gemini sunucusuna bağlanılamadı. Lütfen tekrar dene."
                });
            }

            await new Promise(resolve =>
                setTimeout(resolve, 1000 * (attempt + 1))
            );
        }
    }
}
