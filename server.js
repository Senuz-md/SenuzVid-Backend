const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ඔයාගේ RapidAPI දත්ත
const RAPID_API_KEY = "a09a4b34e5msh6a2c5b0017e5204p14db85jsn8b4043a32df1";

/* ================= PLATFORM DETECTOR ================= */
function detectPlatform(url) {
    const u = url.toLowerCase();
    if (u.includes("instagram.com") || u.includes("instagr.am")) return "Instagram";
    if (u.includes("tiktok.com")) return "TikTok";
    if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com")) return "Facebook";
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
    return "Unknown";
}

/* ================= FETCH DETAILS ================= */
app.get("/api/details", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL missing" });

    const platform = detectPlatform(url);

    try {
        /* ---------- INSTAGRAM (Using your new API) ---------- */
        if (platform === "Instagram") {
            const options = {
                method: 'GET',
                url: 'https://instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com/',
                params: { url: url },
                headers: {
                    'x-rapidapi-key': RAPID_API_KEY,
                    'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories1.p.rapidapi.com'
                }
            };
            const response = await axios.request(options);
            const data = response.data;

            // API එකෙන් එන දත්ත අනුව මේවා වෙනස් විය හැක
            return res.json({
                platform,
                title: "Instagram Post/Reel",
                thumbnail: data.thumbnail || (data[0] ? data[0].thumbnail : "https://files.catbox.moe/1dlcmm.jpg"),
                author: data.username || "Instagram User",
                qualities: ["Download MP4"]
            });
        }

        /* ---------- TIKTOK (Bypass Logic) ---------- */
        if (platform === "TikTok") {
            const tkRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
            if (tkRes.data && tkRes.data.data) {
                const d = tkRes.data.data;
                return res.json({
                    platform,
                    title: d.title || "TikTok Video",
                    thumbnail: d.cover,
                    author: d.author.nickname,
                    qualities: ["HD Video", "Watermark", "Audio"]
                });
            }
        }

        /* ---------- FACEBOOK (Direct Check) ---------- */
        if (platform === "Facebook") {
            return res.json({
                platform,
                title: "Facebook Video",
                thumbnail: "https://files.catbox.moe/1dlcmm.jpg",
                author: "Facebook",
                qualities: ["SD Quality", "HD Quality"]
            });
        }

        return res.status(400).json({ error: "Platform not supported" });

    } catch (e) {
        console.error("Error:", e.message);
        return res.status(500).json({ error: "වීඩියෝව ලබාගත නොහැක. සීමාව ඉක්මවා ඇත." });
    }
});

/* ================= DOWNLOAD REDIRECT ================= */
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
            // API එකෙන් එන direct ලින්ක් එකට redirect කිරීම
            const dlLink = response.data.media || (response.data[0] ? response.data[0].url : "");
            return res.redirect(dlLink);
        }

        if (platform === "TikTok") {
            const tkRes = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
            const link = (quality === "Audio") ? tkRes.data.data.music : tkRes.data.data.play;
            return res.redirect(link);
        }

        res.status(404).send("Download link not found.");
    } catch (e) {
        res.status(500).send("Download failed.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Premium Backend Running on Port ${PORT}`));
