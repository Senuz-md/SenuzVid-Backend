const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ඔයා ලබාගත් API Key එක මෙතන තියෙනවා
const RAPID_API_KEY = "a09a4b34e5msh6a2c5b0017e5204p14db85jsn8b4043a32df1";
const RAPID_API_HOST = "social-media-video-downloader.p.rapidapi.com";

/* ================= PLATFORM DETECTOR ================= */
function detectPlatform(url) {
    const u = url.toLowerCase();
    if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
    if (u.includes("tiktok.com")) return "TikTok";
    if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com")) return "Facebook";
    return "Unknown";
}

/* ================= FETCH DETAILS ================= */
app.get("/api/details", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL එකක් ඇතුළත් කරන්න" });

    const platform = detectPlatform(url);

    try {
        // RapidAPI වෙත Request එක යැවීම (මෙය සියලුම ප්ලැට්ෆෝම් සඳහා වැඩ කරයි)
        const options = {
            method: 'GET',
            url: 'https://social-media-video-downloader.p.rapidapi.com/smvd/get/all',
            params: { url: url },
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': RAPID_API_HOST
            }
        };

        const response = await axios.request(options);
        const data = response.data;

        if (!data || !data.links) {
            return res.status(404).json({ error: "වීඩියෝව සොයාගත නොහැක." });
        }

        // Frontend එකට අවශ්‍ය විදිහට දත්ත සකස් කිරීම
        return res.json({
            platform: platform,
            title: data.title || "Social Media Video",
            thumbnail: data.picture || data.cover,
            author: data.author || platform,
            qualities: data.links.map(l => l.quality) // ["720p", "360p", "audio" වගේ එයි]
        });

    } catch (e) {
        console.error("API Error:", e.message);
        return res.status(500).json({ error: "සර්වර් දෝෂයකි. පසුව උත්සාහ කරන්න." });
    }
});

/* ================= DOWNLOAD ================= */
app.get("/api/download", async (req, res) => {
    const { url, quality } = req.query;

    try {
        const options = {
            method: 'GET',
            url: 'https://social-media-video-downloader.p.rapidapi.com/smvd/get/all',
            params: { url: url },
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': RAPID_API_HOST
            }
        };

        const response = await axios.request(options);
        
        // පරිශීලකයා ඉල්ලපු quality එක තෝරාගැනීම
        const selectedLink = response.data.links.find(l => l.quality === quality) || response.data.links[0];

        if (!selectedLink) return res.status(404).send("Link not found");

        // කෙලින්ම වීඩියෝ ලින්ක් එකට redirect කිරීම (මෙය වේගවත් ක්‍රමයයි)
        res.redirect(selectedLink.link);

    } catch (e) {
        res.status(500).send("බාගත කිරීමේ දෝෂයකි.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SenuzVid Premium Backend Running on Port ${PORT}`));
