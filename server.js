const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const RAPID_API_KEY = "a09a4b34e5msh6a2c5b0017e5204p14db85jsn8b4043a32df1";

/* ================= PLATFORM DETECTOR ================= */
function detectPlatform(url) {
    const u = url.toLowerCase();
    if (u.includes("instagram.com")) return "Instagram";
    if (u.includes("tiktok.com")) return "TikTok";
    if (u.includes("facebook.com") || u.includes("fb.watch")) return "Facebook";
    return "Unknown";
}

/* ================= FETCH DETAILS ================= */
app.get("/api/details", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL missing" });

    const platform = detectPlatform(url);

    try {
        /* ---------- INSTAGRAM ---------- */
        if (platform === "Instagram") {
            const options = {
                method: 'GET',
                url: 'https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/',
                params: { url: url }, // වීඩියෝ URL එක මෙතනට යනවා
                headers: {
                    'x-rapidapi-key': RAPID_API_KEY,
                    'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
                }
            };
            const response = await axios.request(options);
            const data = response.data; // API එකේ response එක අනුව මේවා වෙනස් විය හැක

            return res.json({
                platform,
                title: "Instagram Media",
                thumbnail: data.thumbnail || data.image || "",
                author: data.username || "Instagram User",
                qualities: ["High Quality", "Standard"]
            });
        }

        /* ---------- TIKTOK (Alternative Stable API) ---------- */
        if (platform === "TikTok") {
            // TikWM වෙනුවට මේ endpoint එක බලමු (RapidAPI නෙවෙයි, direct bypass එකක්)
            const tkRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
            if (tkRes.data && tkRes.data.data) {
                const d = tkRes.data.data;
                return res.json({
                    platform,
                    title: d.title || "TikTok Video",
                    thumbnail: d.cover,
                    author: d.author.nickname,
                    qualities: ["HD", "SD", "Audio"]
                });
            }
        }

        return res.status(400).json({ error: "Platform not supported" });

    } catch (e) {
        console.error("Fetch Error:", e.message);
        return res.status(500).json({ error: "වීඩියෝව ලබාගත නොහැක. සීමාව ඉක්මවා ඇත (Limit Exceeded)." });
    }
});

/* ================= DOWNLOAD ================= */
app.get("/api/download", async (req, res) => {
    const { url, quality } = req.query;
    const platform = detectPlatform(url);

    try {
        if (platform === "Instagram") {
            const options = {
                method: 'GET',
                url: 'https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/',
                params: { url: url },
                headers: { 'x-rapidapi-key': RAPID_API_KEY }
            };
            const response = await axios.request(options);
            // පළවෙනි වීඩියෝ ලින්ක් එකට redirect කරනවා
            const dlLink = response.data.media || response.data[0].url;
            return res.redirect(dlLink);
        }

        if (platform === "TikTok") {
            const tkRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
            const link = (quality === "Audio") ? tkRes.data.data.music : tkRes.data.data.play;
            return res.redirect(link);
        }

    } catch (e) {
        res.status(500).send("Download failed.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SenuzVid Premium on ${PORT}`));
