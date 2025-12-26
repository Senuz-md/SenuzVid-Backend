const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());

// Bot detection bypass headers
const commonHeaders = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive"
};

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
    if (!url) return res.status(400).json({ error: "URL missing" });

    const platform = detectPlatform(url);

    try {
        /* ---------- YOUTUBE ---------- */
        if (platform === "YouTube") {
            const info = await ytdl.getInfo(url);
            return res.json({
                platform,
                title: info.videoDetails.title,
                thumbnail: info.videoDetails.thumbnails.pop().url,
                author: info.videoDetails.author.name,
                qualities: ["720p", "360p", "audio"]
            });
        }

        /* ---------- TIKTOK ---------- */
        if (platform === "TikTok") {
            const response = await axios.get(`https://api.tikwm.com/api/?url=${encodeURIComponent(url)}`, { headers: commonHeaders });
            const d = response.data.data;
            if (!d) throw new Error("TikTok data not found");
            return res.json({
                platform,
                title: d.title || "TikTok Video",
                thumbnail: d.cover,
                author: d.author.nickname,
                qualities: ["HD", "SD", "audio"]
            });
        }

        /* ---------- FACEBOOK (Advanced Fix) ---------- */
        if (platform === "Facebook") {
            // vkrdownloader වැඩ නැත්නම් වෙනත් public API එකක් පාවිච්චි කරමු
            const fbApi = `https://api.vkrdownloader.tk/server/fb.php?v=${encodeURIComponent(url)}`;
            const response = await axios.get(fbApi, { headers: commonHeaders, timeout: 15000 });
            
            if (response.data && response.data.data) {
                const d = response.data.data;
                return res.json({
                    platform,
                    title: d.title || "Facebook Video",
                    thumbnail: d.thumbnail,
                    author: "Facebook",
                    qualities: ["HD", "SD"]
                });
            }
            throw new Error("Facebook API Limit Reached");
        }

        return res.status(400).json({ error: "Unsupported Platform" });

    } catch (e) {
        console.error("Error fetching details:", e.message);
        return res.status(500).json({ error: "වීඩියෝ තොරතුරු ලබාගත නොහැක. පසුව උත්සාහ කරන්න." });
    }
});

/* ================= DOWNLOAD ================= */
app.get("/api/download", async (req, res) => {
    const { url, quality } = req.query;
    const platform = detectPlatform(url);

    try {
        let dlLink = "";

        if (platform === "YouTube") {
            res.header("Content-Disposition", 'attachment; filename="senuzvid_yt.mp4"');
            const format = quality === "audio" ? "highestaudio" : "highest";
            return ytdl(url, { quality: format }).pipe(res);
        }

        if (platform === "TikTok") {
            const r = await axios.get(`https://api.tikwm.com/api/?url=${encodeURIComponent(url)}`);
            dlLink = (quality === "audio") ? r.data.data.music : r.data.data.play;
        } 
        else if (platform === "Facebook") {
            const r = await axios.get(`https://api.vkrdownloader.tk/server/fb.php?v=${encodeURIComponent(url)}`);
            dlLink = (quality === "HD") ? r.data.data.hd : r.data.data.sd;
        }

        if (!dlLink) throw new Error("Download link invalid");

        const streamResponse = await axios({
            url: dlLink,
            method: 'GET',
            responseType: 'stream',
            headers: commonHeaders
        });

        res.header("Content-Disposition", `attachment; filename="senuzvid_${platform}.mp4"`);
        return streamResponse.data.pipe(res);

    } catch (e) {
        console.error("Download error:", e.message);
        res.status(500).send("බාගත කිරීමේ දෝෂයකි.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server online on ${PORT}`));
