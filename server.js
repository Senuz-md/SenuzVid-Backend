// server.js
import express from "express";
import cors from "cors";
import axios from "axios";
import ytdl from "ytdl-core";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------------- PLATFORM DETECTOR ----------------
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

// ---------------- HEALTH CHECK ----------------
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is Online 👍" });
});

// ---------------- VIDEO DETAILS ----------------
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
        qualities: ["360p", "480p", "720p", "audio"],
      });
    }

    if (platform === "TikTok") {
      const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);
      if (!response.data?.data) throw new Error("TikTok API failed");

      const d = response.data.data;
      return res.json({
        platform: "TikTok",
        title: d.title,
        author: d.author?.nickname || "Unknown",
        thumbnail: d.cover,
        qualities: ["720p", "360p", "audio"],
      });
    }

    if (platform === "Facebook") {
      const api = `https://api.exfly.dev/fbdl?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);
      if (!response.data?.title) throw new Error("FB fetch failed");

      return res.json({
        platform: "Facebook",
        title: response.data.title,
        author: response.data.author || "Facebook User",
        thumbnail: response.data.thumbnail,
        qualities: ["hd", "sd"],
      });
    }

    return res.status(400).json({ error: `${platform} not supported` });
  } catch (err) {
    return res.status(500).json({ error: `${platform} details failed` });
  }
});

// ---------------- DOWNLOAD ----------------
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  if (!url) return res.status(400).json({ error: "URL missing" });

  const platform = detectPlatform(url);

  try {
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);
      const video =
        quality === "audio"
          ? ytdl(url, { filter: "audioonly", quality: "highestaudio" })
          : ytdl(url, { filter: "audioandvideo", quality });

      res.header(
        "Content-Disposition",
        `attachment; filename="${info.videoDetails.title}.${
          quality === "audio" ? "mp3" : "mp4"
        }"`
      );
      return video.pipe(res);
    }

    if (platform === "TikTok") {
      const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const response = await axios.get(api);
      const videoUrl =
        quality === "audio"
          ? response.data.data.music
          : response.data.data.play;
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
    return res.status(500).json({ error: `${platform} download failed` });
  }
});

// ---------------- LISTEN ----------------
app.listen(port, () => {
  console.log(`🚀 SenuzVid Backend Running on Port ${port}`);
});
