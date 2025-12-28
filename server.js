// server.js — SenuzVid Final Backend (Quality Fixed)

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
    /* ---------- TIKTOK ---------- */
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const d = r.data.data;
      return res.json({
        platform: "TikTok",
        title: d.title || "TikTok Video",
        author: d.author.nickname,
        thumbnail: d.cover,
        qualities: ["4k", "2k", "1080p", "720p", "480p", "360p", "audio"]
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

    /* ---------- FB & IG ---------- */
    if (platform === "Facebook" || platform === "Instagram") {
      const api = `https://api.vkrdownloader.tk/server/wrapper.php?url=${encodeURIComponent(url)}`;
      const r = await axios.get(api);
      const d = r.data.data;
      return res.json({
        platform,
        title: d.title || `${platform} Video`,
        author: platform,
        thumbnail: d.thumbnail || d.cover,
        qualities: ["1080p", "720p", "sd", "audio"]
      });
    }

    return res.status(400).json({ error: "Platform not supported" });

  } catch (e) {
    return res.status(500).json({ error: "Server Error: Details unavailable" });
  }
});

/* ================= DOWNLOAD (QUALITY FIXED) ================= */
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  const platform = detectPlatform(url);

  if (!url) return res.status(400).send("URL missing");

  try {
    /* ---------- TIKTOK LOGIC ---------- */
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const d = r.data.data;

      let dlLink;
      const q = quality ? quality.toLowerCase() : "";

      if (q === "audio") {
        dlLink = d.music;
      } 
      // ඔයාගේ සයිට් එකේ තියෙන 4k, 2k, 1080p සඳහා HD Link එක ලබාදීම
      else if (["4k", "2k", "1080p", "hd"].includes(q)) {
        dlLink = d.hdplay || d.play; 
      } 
      // අනෙක් (720p, 480p, 360p) සඳහා සාමාන්‍ය Link එක ලබාදීම
      else {
        dlLink = d.play;
      }
      return res.redirect(dlLink);
    }

    /* ---------- YOUTUBE LOGIC ---------- */
    if (platform === "YouTube") {
      const itagMap = { "1080p": 137, "720p": 22, "480p": 135, "360p": 18 };
      const selectedTag = itagMap[quality] || (quality === "audio" ? "highestaudio" : "highest");
      
      res.header("Content-Disposition", 'attachment; filename="video.mp4"');
      return ytdl(url, { quality: selectedTag }).pipe(res);
    }

    /* ---------- FB & IG LOGIC ---------- */
    if (platform === "Facebook" || platform === "Instagram") {
      const r = await axios.get(`https://api.vkrdownloader.tk/server/wrapper.php?url=${encodeURIComponent(url)}`);
      const downloads = r.data.data.downloads;
      const q = quality ? quality.toLowerCase() : "720p";
      
      const dlLink = downloads.find(d => d.quality.toLowerCase().includes(q))?.url || downloads[0].url;
      return res.redirect(dlLink);
    }

  } catch (e) {
    console.error(e);
    return res.status(500).send("Download Link Generation Failed.");
  }
});

/* ================= SERVER START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  🚀 SenuzVid Backend Running
  📡 Port: ${PORT}
  🔗 Platform Support: TikTok, YouTube, FB, IG
  `);
});
