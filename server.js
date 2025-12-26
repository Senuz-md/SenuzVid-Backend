const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// ඔයාගේ API Key එක
const RAPID_API_KEY = "a09a4b34e5msh6a2c5b0017e5204p14db85jsn8b4043a32df1";
const RAPID_API_HOST = "social-media-video-downloader.p.rapidapi.com";

/* ================= PLATFORM DETECTOR ================= */
function detectPlatform(url) {
    const u = url.toLowerCase();
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
    let apiUrl = "";

    // ඔයාගේ API එකේ ප්ලැට්ෆෝම් අනුව Endpoints වෙනස් වෙයි
    if (platform === "TikTok") apiUrl = "https://social-media-video-downloader.p.rapidapi.com/tiktok/v3/video/details";
    else if (platform === "Facebook") apiUrl = "https://social-media-video-downloader.p.rapidapi.com/facebook/v3/video/details";
    else if (platform === "YouTube") apiUrl = "https://social-media-video-downloader.p.rapidapi.com/youtube/v3/video/details";
    else return res.status(400).json({ error: "Unsupported Platform" });

    try {
        const options = {
            method: 'GET',
            url: apiUrl,
            params: { url: url, renderableFormats: '720p,highres', urlAccess: 'proxied' },
            headers: {
                'x-rapidapi-key': RAPID_API_KEY,
                'x-rapidapi-host': RAPID_API_HOST
            }
        };

        const response = await axios.request(options);
        const data = response.data;

        // API එකෙන් එන දත්ත වල හැඩය අනුව මෙතන පොඩ්ඩක් වෙනස් වෙනවා
        const videoInfo = data.data || data; 

        return res.json({
            platform: platform,
            title: videoInfo.title || "Social Video",
            thumbnail: videoInfo.thumbnail || videoInfo.picture || "",
            author: videoInfo.author || platform,
            qualities: videoInfo.formats ? videoInfo.formats.map(f => f.quality) : ["HD", "SD", "audio"]
        });

    } catch (e) {
        console.error("API Fetch Error:", e.response ? e.response.data : e.message);
        return res.status(500).json({ error: "සර්වර් දෝෂයකි. API Key එකේ සීමාව පැනලා වෙන්න පුළුවන්." });
    }
});

/* ================= DOWNLOAD ================= */
app.get("/api/download", async (req, res) => {
    const { url, quality } = req.query;
    // Download එක සඳහා කෙලින්ම quality එකට අදාල ලින්ක් එකට redirect කරන්න
    // මේක ඔයාගේ කලින් endpoint එකෙන්ම ආයෙත් fetch කරලා ගන්න ඕනේ
    res.status(500).send("බාගත කිරීම තවමත් සක්‍රිය නැත. Details වැඩදැයි මුලින් බලන්න.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
