// server.js — SenuzVid PRO (Stability Optimized for Heroku)

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("@distube/ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());

// සර්වර් එක වැඩ දැයි පරීක්ෂා කිරීමට (Root route)
app.get("/", (req, res) => {
  res.send("SenuzVid Engine is Online 🚀");
});

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
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL missing" });

  const platform = detectPlatform(url);

  try {
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const d = r.data.data;
      return res.json({
        platform: "TikTok",
        title: d.title || "TikTok Video",
        author: d.author.nickname,
        thumbnail: d.cover,
        qualities: ["4k", "1080p", "720p", "audio"]
      });
    }

    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      return res.json({
        platform: "YouTube",
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails.pop().url,
        qualities: ["1080p", "720p", "audio"]
      });
    }

    if (platform === "Facebook" || platform === "Instagram") {
      const api = `https://api.vkrdownloader.tk/server/wrapper.php?url=${encodeURIComponent(url)}`;
      const r = await axios.get(api);
      const d = r.data.data;
      return res.json({
        platform,
        title: d.title || `${platform} Video`,
        author: platform,
        thumbnail: d.thumbnail || d.cover,
        qualities: ["1080p", "720p", "audio"]
      });
    }

    return res.status(400).json({ error: "Platform not supported" });

  } catch (e) {
    console.error("Details Error:", e.message);
    return res.status(500).json({ error: "ලින්ක් එක පරීක්ෂා කිරීමේදී ගැටලුවක් මතු විය." });
  }
});

/* ================= DOWNLOAD (QUALITY FIXED) ================= */
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  const platform = detectPlatform(url);
  const q = quality ? quality.toLowerCase() : "";

  if (!url) return res.status(400).send("URL missing");

  try {
    /* ---------- TIKTOK ---------- */
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const d = r.data.data;
      if (q === "audio") return res.redirect(d.music);
      const dlLink = (["4k", "2k", "1080p"].includes(q)) ? (d.hdplay || d.play) : d.play;
      return res.redirect(dlLink);
    }

    /* ---------- YOUTUBE ---------- */
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      let format;
      if (q === "audio") {
        format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
      } else {
        // Progressive formats (Video + Audio combined) are best for basic servers
        format = ytdl.chooseFormat(info.formats, { filter: 'audioandvideo', quality: 'highest' });
      }
      return res.redirect(format.url);
    }

    /* ---------- FB & IG ---------- */
    if (platform === "Facebook" || platform === "Instagram") {
      const r = await axios.get(`https://api.vkrdownloader.tk/server/wrapper.php?url=${encodeURIComponent(url)}`);
      const downloads = r.data.data.downloads;
      const dlLink = downloads.find(d => d.quality.toLowerCase().includes(q))?.url || downloads[0].url;
      return res.redirect(dlLink);
    }

  } catch (e) {
    console.error("Download Error:", e.message);
    return res.status(500).send("ඩවුන්ලෝඩ් ලින්ක් එක සකස් කිරීමට නොහැකි විය.");
  }
});

/* ================= SERVER START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SenuzVid Engine Running on Port ${PORT}`);
});
