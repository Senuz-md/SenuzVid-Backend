// server.js — SenuzVid Backend (Enhanced Quality Edition)

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= PLATFORM DETECTOR ================= */
function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("tiktok.com") || u.includes("vm.tiktok")) return "TikTok";
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "Instagram";
  if (u.includes("facebook.com") || u.includes("fb.watch") || u.includes("fb.com")) return "Facebook";
  return "Unknown";
}

/* ================= FETCH DETAILS ================= */
app.get("/api/details", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL missing" });

  const platform = detectPlatform(url);

  try {
    /* ---------- TIKTOK (Stable) ---------- */
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const d = r.data.data;
      return res.json({
        platform: "TikTok",
        title: d.title || "TikTok Video",
        author: d.author.nickname,
        thumbnail: d.cover,
        qualities: ["4K Ultra HD", "1080p FHD", "720p HD", "360p", "audio"]
      });
    }

    /* ---------- FACEBOOK & INSTAGRAM (Universal) ---------- */
    if (platform === "Facebook" || platform === "Instagram") {
      // මෙහිදී අපි vkrdownloader හි bypass endpoint එක භාවිතා කරනවා
      const api = `https://api.vkrdownloader.tk/server/wrapper.php?url=${encodeURIComponent(url)}`;
      const r = await axios.get(api);
      const d = r.data.data;

      return res.json({
        platform,
        title: d.title || `${platform} Video`,
        author: platform,
        thumbnail: d.thumbnail || d.cover,
        qualities: ["4K", "2K", "1080p", "720p", "sd", "audio"]
      });
    }

    /* ---------- YOUTUBE ---------- */
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      const qualities = [...new Set(info.formats.filter(f => f.qualityLabel).map(f => f.qualityLabel)), "audio"];
      return res.json({
        platform: "YouTube",
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails.pop().url,
        qualities
      });
    }

    return res.status(400).json({ error: "Platform not supported" });

  } catch (e) {
    return res.status(500).json({ error: "Details unavailable at the moment" });
  }
});

/* ================= DOWNLOAD ================= */
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  const platform = detectPlatform(url);

  try {
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const dlLink = (quality === "audio") ? r.data.data.music : r.data.data.play;
      return res.redirect(dlLink);
    }

    if (platform === "Facebook" || platform === "Instagram") {
      const r = await axios.get(`https://api.vkrdownloader.tk/server/wrapper.php?url=${encodeURIComponent(url)}`);
      // User තෝරාගන්නා quality එක අනුව link එක ලබාදීම
      const dlLink = r.data.data.downloads.find(d => d.quality.includes(quality))?.url || r.data.data.downloads[0].url;
      return res.redirect(dlLink);
    }

    if (platform === "YouTube") {
      res.header("Content-Disposition", 'attachment; filename="video.mp4"');
      return ytdl(url, { quality: quality === "audio" ? "highestaudio" : "highest" }).pipe(res);
    }

  } catch (e) {
    return res.status(500).send("Download failed. Link expired.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SenuzVid running on ${PORT}`));
