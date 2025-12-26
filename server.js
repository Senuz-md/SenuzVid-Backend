// server.js — SenuzVid Backend (Enhanced & Fixed)

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= HEALTH CHECK ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "SenuzVid Server is Online 🚀" });
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
        qualities
      });
    }

    /* ---------- TIKTOK (Using TikWM) ---------- */
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const d = r.data.data;
      return res.json({
        platform: "TikTok",
        title: d.title || "TikTok Video",
        thumbnail: d.cover,
        qualities: ["HD", "SD", "audio"]
      });
    }

    /* ---------- FACEBOOK (Stable API) ---------- */
    if (platform === "Facebook") {
      // මෙහිදී වඩාත් ස්ථාවර public API එකක් භාවිතා කර ඇත
      const fbApi = `https://api.vkrdownloader.tk/server/fb.php?v=${encodeURIComponent(url)}`;
      const r = await axios.get(fbApi);
      
      if (!r.data || !r.data.data) throw new Error("FB API Error");

      return res.json({
        platform: "Facebook",
        title: r.data.data.title || "Facebook Video",
        thumbnail: r.data.data.thumbnail,
        qualities: ["HD", "SD"]
      });
    }

    return res.status(400).json({ error: "Platform not supported" });
  } catch (e) {
    return res.status(500).json({ error: "Could not fetch video details" });
  }
});

/* ================= DOWNLOAD LOGIC ================= */
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  if (!url) return res.status(400).json({ error: "URL missing" });

  const platform = detectPlatform(url);

  try {
    /* ---------- YOUTUBE ---------- */
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      const format = quality === "audio" ? "highestaudio" : "highestvideo";
      res.header("Content-Disposition", `attachment; filename="video.mp4"`);
      return ytdl(url, { quality: format }).pipe(res);
    }

    /* ---------- TIKTOK ---------- */
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const link = quality === "audio" ? r.data.data.music : r.data.data.play;
      const stream = await axios.get(link, { responseType: "stream" });
      res.header("Content-Disposition", `attachment; filename="tiktok.mp4"`);
      return stream.data.pipe(res);
    }

    /* ---------- FACEBOOK ---------- */
    if (platform === "Facebook") {
      const fbApi = `https://api.vkrdownloader.tk/server/fb.php?v=${encodeURIComponent(url)}`;
      const r = await axios.get(fbApi);
      const link = quality === "HD" ? r.data.data.hd : r.data.data.sd;
      
      const stream = await axios.get(link, { responseType: "stream" });
      res.header("Content-Disposition", `attachment; filename="facebook.mp4"`);
      return stream.data.pipe(res);
    }

  } catch (e) {
    return res.status(500).json({ error: "Download failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
