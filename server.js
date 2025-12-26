const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());

// Request Headers (වැදගත්: මේවා නැතිවුණොත් Facebook/TikTok අපේ request block කරනවා)
const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
};

/* ================= HEALTH CHECK ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is Online 👍", time: new Date() });
});

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
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  const platform = detectPlatform(url);

  try {
    /* ---------- YOUTUBE ---------- */
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      const qualities = [...new Set(info.formats.filter(f => f.hasVideo && f.hasAudio).map(f => f.qualityLabel)), "audio"];
      return res.json({
        platform,
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails.pop().url,
        qualities
      });
    }

    /* ---------- FACEBOOK & TIKTOK (Universal API) ---------- */
    // මෙහිදී වඩාත් ස්ථාවර 'vkrdownloader' හෝ 'tikwm' bypass එකක් භාවිතා කරමු
    let apiUrl = "";
    if (platform === "TikTok") apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    if (platform === "Facebook") apiUrl = `https://api.vkrdownloader.tk/server/fb.php?v=${encodeURIComponent(url)}`;

    const r = await axios.get(apiUrl, { headers, timeout: 10000 });
    
    if (platform === "TikTok" && r.data.data) {
        const d = r.data.data;
        return res.json({
            platform,
            title: d.title || "TikTok Video",
            author: d.author.nickname || "TikTok User",
            thumbnail: d.cover,
            qualities: ["HD", "SD", "audio"]
        });
    }

    if (platform === "Facebook" && r.data.data) {
        const d = r.data.data;
        return res.json({
            platform,
            title: d.title || "Facebook Video",
            author: "FB User",
            thumbnail: d.thumbnail,
            qualities: ["HD", "SD"]
        });
    }

    throw new Error("No data found from provider");

  } catch (e) {
    console.error("Fetch Error:", e.message);
    return res.status(500).json({ error: "Could not fetch video. Link might be private or broken." });
  }
});

/* ================= DOWNLOAD LOGIC ================= */
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  const platform = detectPlatform(url);

  try {
    if (platform === "YouTube") {
      res.header("Content-Disposition", 'attachment; filename="video.mp4"');
      const format = quality === "audio" ? "highestaudio" : "highest";
      return ytdl(url, { quality: format }).pipe(res);
    }

    let dlLink = "";
    if (platform === "TikTok") {
        const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
        dlLink = quality === "audio" ? r.data.data.music : r.data.data.play;
    } 
    else if (platform === "Facebook") {
        const r = await axios.get(`https://api.vkrdownloader.tk/server/fb.php?v=${encodeURIComponent(url)}`);
        dlLink = (quality === "HD") ? r.data.data.hd : r.data.data.sd;
    }

    if (!dlLink) throw new Error("Download link not found");

    const response = await axios({ url: dlLink, method: 'GET', responseType: 'stream', headers });
    res.header("Content-Disposition", `attachment; filename="${platform}_video.mp4"`);
    return response.data.pipe(res);

  } catch (e) {
    res.status(500).send("Download failed.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SenuzVid Premium running on ${PORT}`));
