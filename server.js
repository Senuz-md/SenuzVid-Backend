// server.js — SenuzVid Ultimate Backend (Fixed YouTube & TikTok Qualities)

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("@distube/ytdl-core");

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
        qualities: ["1080p", "720p", "480p", "audio"]
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
        qualities: ["1080p", "720p", "sd", "audio"]
      });
    }

    return res.status(400).json({ error: "Platform not supported" });

  } catch (e) {
    return res.status(500).json({ error: "Details unavailable. YouTube/API might be rate-limited." });
  }
});

/* ================= DOWNLOAD LOGIC (FIXED) ================= */
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  const platform = detectPlatform(url);

  if (!url) return res.status(400).send("URL missing");

  try {
    /* ---------- TIKTOK ---------- */
    if (platform === "TikTok") {
      const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const d = r.data.data;
      const q = quality ? quality.toLowerCase() : "";

      if (q === "audio") return res.redirect(d.music);
      
      // TikTok Qualities: 'hd' labels ලැබුණොත් hdplay ලබා දෙයි
      const dlLink = (["4k", "1080p", "hd"].includes(q)) ? (d.hdplay || d.play) : d.play;
      return res.redirect(dlLink);
    }

    /* ---------- YOUTUBE (Using @distube/ytdl-core) ---------- */
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      let format;

      if (quality === "audio") {
        format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
      } else {
        // වීඩියෝ සහ ඕඩියෝ දෙකම සහිත හොඳම format එක තෝරාගනී
        format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });
      }

      if (format && format.url) {
        return res.redirect(format.url);
      } else {
        return res.status(404).send("YouTube format not found.");
      }
    }

    /* ---------- FACEBOOK & INSTAGRAM ---------- */
    if (platform === "Facebook" || platform === "Instagram") {
      const r = await axios.get(`https://api.vkrdownloader.tk/server/wrapper.php?url=${encodeURIComponent(url)}`);
      const downloads = r.data.data.downloads;
      const q = quality ? quality.toLowerCase() : "1080";
      
      const dlLink = downloads.find(d => d.quality.toLowerCase().includes(q))?.url || downloads[0].url;
      return res.redirect(dlLink);
    }

  } catch (e) {
    console.error("Download Error:", e.message);
    return res.status(500).send("සර්වර් එකේ ගැටලුවක්. කරුණාකර නැවත උත්සාහ කරන්න.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SenuzVid Engine Live on Port ${PORT}`));
