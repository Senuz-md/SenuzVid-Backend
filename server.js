const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());

// API Request Timeout (සමහර API පරක්කු වන නිසා)
const TIMEOUT = 15000; 

/* ================= HEALTH CHECK ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "SenuzVid Server is Online 🚀", plan: "Premium/Paid" });
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
        platform: "YouTube",
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails.pop().url,
        author: info.videoDetails.author.name,
        qualities
      });
    }

    /* ---------- TIKTOK (TikWM Redirect Fix) ---------- */
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, { timeout: TIMEOUT });
      if (!r.data || !r.data.data) throw new Error("TikTok API error");
      const d = r.data.data;
      return res.json({
        platform: "TikTok",
        title: d.title || "TikTok Video",
        thumbnail: d.cover,
        author: d.author.nickname,
        qualities: ["HD", "SD", "audio"]
      });
    }

    /* ---------- FACEBOOK (vkrdownloader logic) ---------- */
    if (platform === "Facebook") {
      const fbApi = `https://api.vkrdownloader.tk/server/fb.php?v=${encodeURIComponent(url)}`;
      const r = await axios.get(fbApi, { timeout: TIMEOUT });
      
      if (!r.data || !r.data.data) {
          // Alternative FB API fallback
          return res.status(500).json({ error: "Facebook Details Unreachable" });
      }

      return res.json({
        platform: "Facebook",
        title: r.data.data.title || "Facebook Video",
        thumbnail: r.data.data.thumbnail,
        author: "Facebook User",
        qualities: ["HD", "SD"]
      });
    }

    return res.status(400).json({ error: "Platform not supported" });
  } catch (e) {
    console.error("Fetch Error:", e.message);
    return res.status(500).json({ error: "Could not fetch details. Please try another link." });
  }
});

/* ================= DOWNLOAD LOGIC ================= */
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  if (!url) return res.status(400).json({ error: "URL missing" });

  const platform = detectPlatform(url);

  try {
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      const fileName = `${info.videoDetails.title.replace(/[^\w\s]/gi, '')}.mp4`;
      res.header("Content-Disposition", `attachment; filename="${fileName}"`);
      
      if (quality === "audio") {
        return ytdl(url, { filter: "audioonly", quality: "highestaudio" }).pipe(res);
      }
      return ytdl(url, { filter: "audioandvideo", quality: "highest" }).pipe(res);
    }

    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const dlLink = quality === "audio" ? r.data.data.music : r.data.data.play;
      const response = await axios({ url: dlLink, method: 'GET', responseType: 'stream' });
      res.header("Content-Disposition", `attachment; filename="tiktok_video.mp4"`);
      return response.data.pipe(res);
    }

    if (platform === "Facebook") {
      const fbApi = `https://api.vkrdownloader.tk/server/fb.php?v=${encodeURIComponent(url)}`;
      const r = await axios.get(fbApi);
      const dlLink = quality === "HD" ? r.data.data.hd : r.data.data.sd;
      const response = await axios({ url: dlLink, method: 'GET', responseType: 'stream' });
      res.header("Content-Disposition", `attachment; filename="facebook_video.mp4"`);
      return response.data.pipe(res);
    }

  } catch (e) {
    console.error("Download Error:", e.message);
    return res.status(500).send("Download failed. The video link might be expired.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Premium Server Running on Port ${PORT}`));
