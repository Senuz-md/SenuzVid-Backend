console.log("BOOT OK");

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors()); // must be immediately after express init

// Root route
app.get("/", (req, res) => res.send("SenuzVid Backend OK"));

// Heroku safe port
const PORT = process.env.PORT || 3000;

// Platform detector
function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("tiktok.com") || u.includes("vm.tiktok")) return "TikTok";
  if (u.includes("instagram.com") || u.includes("instagr")) return "Instagram";
  if (
    u.includes("facebook.com") ||
    u.includes("m.facebook.com") ||
    u.includes("web.facebook.com") ||
    u.includes("fb.watch")
  ) return "Facebook";
  if (u.includes("twitter.com") || u.includes("x.com")) return "X";
  return "Unknown";
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Server Online 👍" });
});

// Fetch video details
app.get("/api/details", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing URL" });
  const platform = detectPlatform(url);

  try {
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      return res.json({
        platform: "YouTube",
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails.pop().url,
        qualities: ["360p", "480p", "720p", "audio"]
      });
    }

    if (platform === "TikTok") {
      const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);
      const d = response.data.data;
      return res.json({
        platform: "TikTok",
        title: d.title,
        author: d.author.nickname,
        thumbnail: d.cover,
        qualities: ["720p", "360p", "audio"]
      });
    }

    if (platform === "Facebook") {
      const api = `https://api.exfly.dev/fbdl?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);
      return res.json({
        platform: "Facebook",
        title: response.data.title,
        author: response.data.author || "Facebook User",
        thumbnail: response.data.thumbnail,
        qualities: ["hd", "sd"]
      });
    }

    return res.status(400).json({ error: `${platform} not supported` });
  } catch (err) {
    return res.status(500).json({ error: `${platform} fetch failed`, details: err.message });
  }
});

// Download video
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  if (!url) return res.status(400).json({ error: "URL missing" });

  const platform = detectPlatform(url);

  try {
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      if (quality === "audio") {
        const audio = ytdl(url, { filter: "audioonly", quality: "highestaudio" });
        res.header("Content-Disposition", `attachment; filename="${info.videoDetails.title}.mp3"`);
        return audio.pipe(res);
      }
      const video = ytdl(url, { filter: "audioandvideo", quality });
      res.header("Content-Disposition", `attachment; filename="${info.videoDetails.title}.mp4"`);
      return video.pipe(res);
    }

    if (platform === "TikTok") {
      const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);
      const videoUrl = quality === "audio" ? response.data.data.music : response.data.data.play;
      const video = await axios.get(videoUrl, { responseType: "stream" });
      res.header("Content-Disposition", `attachment; filename="tiktok.mp4"`);
      return video.data.pipe(res);
    }

    if (platform === "Facebook") {
      const api = `https://api.exfly.dev/fbdl?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);
      const link = quality === "hd" ? response.data.hd : response.data.sd;
      const file = await axios.get(link, { responseType: "stream" });
      res.header("Content-Disposition", `attachment; filename="fb_video.mp4"`);
      return file.data.pipe(res);
    }

    return res.status(400).json({ error: `${platform} not supported` });
  } catch (err) {
    return res.status(500).json({ error: `${platform} download failed`, details: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`🚀 SenuzVid Backend Running on Port ${PORT}`));
