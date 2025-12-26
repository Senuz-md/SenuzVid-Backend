const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());

// Heroku IP Block එක bypass කරන්න headers පාවිච්චි කරමු
const getHeaders = () => ({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.google.com/"
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
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL එකක් ඇතුළත් කරන්න" });

  const platform = detectPlatform(url);

  try {
    /* ---------- YOUTUBE ---------- */
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      return res.json({
        platform,
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails.pop().url,
        qualities: ["720p", "360p", "audio"]
      });
    }

    /* ---------- TIKTOK (Alternative API) ---------- */
    if (platform === "TikTok") {
      // TikWM වැඩ නැත්නම් මේ API එක try කරයි
      const r = await axios.get(`https://api.tikwm.com/api/?url=${encodeURIComponent(url)}`, { headers: getHeaders() });
      if (!r.data || !r.data.data) throw new Error("TikTok API Blocked");
      
      const d = r.data.data;
      return res.json({
        platform,
        title: d.title || "TikTok Video",
        author: d.author.nickname,
        thumbnail: d.cover,
        qualities: ["HD", "SD", "audio"]
      });
    }

    /* ---------- FACEBOOK (New Bypass API) ---------- */
    if (platform === "Facebook") {
      // FB සඳහා දැනට වැඩ කරන වඩාත් ස්ථාවර API එක
      const fbApi = `https://api.vkrdownloader.tk/server/fb.php?v=${encodeURIComponent(url)}`;
      const r = await axios.get(fbApi, { headers: getHeaders(), timeout: 15000 });
      
      if (r.data && r.data.data) {
        return res.json({
          platform,
          title: r.data.data.title || "Facebook Video",
          thumbnail: r.data.data.thumbnail,
          author: "Facebook",
          qualities: ["HD", "SD"]
        });
      }
      throw new Error("Facebook API Down");
    }

    return res.status(400).json({ error: "මෙම Link එකට සහය නොදක්වයි" });

  } catch (e) {
    console.error("Error:", e.message);
    return res.status(500).json({ error: "වීඩියෝව ලබාගත නොහැක. පසුව උත්සාහ කරන්න." });
  }
});

/* ================= DOWNLOAD ================= */
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  const platform = detectPlatform(url);

  try {
    let dlLink = "";

    if (platform === "YouTube") {
      res.header("Content-Disposition", 'attachment; filename="video.mp4"');
      return ytdl(url, { quality: quality === "audio" ? "highestaudio" : "highest" }).pipe(res);
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

    // Proxy the download to avoid CORS or IP blocks
    const response = await axios({ url: dlLink, method: 'GET', responseType: 'stream', headers: getHeaders() });
    res.header("Content-Disposition", `attachment; filename="${platform}_video.mp4"`);
    return response.data.pipe(res);

  } catch (e) {
    res.status(500).send("බාගත කිරීම අසාර්ථකයි.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 SenuzVid Running on ${PORT}`));
