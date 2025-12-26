// server.js — SenuzVid Backend (Heroku Ready)

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= HEALTH ================= */
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is Online 👍" });
});

/* ================= PLATFORM DETECTOR ================= */
function detectPlatform(url) {
  const u = url.toLowerCase();

  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
  if (u.includes("tiktok.com") || u.includes("vm.tiktok")) return "TikTok";
  if (
    u.includes("facebook.com") ||
    u.includes("m.facebook.com") ||
    u.includes("web.facebook.com") ||
    u.includes("fb.watch")
  )
    return "Facebook";

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

      const qualities = [
        ...new Set(
          info.formats
            .filter(f => f.hasVideo && f.hasAudio && f.qualityLabel)
            .map(f => f.qualityLabel)
        ),
        "audio"
      ];

      return res.json({
        platform: "YouTube",
        title: info.videoDetails.title,
        author: info.videoDetails.author.name,
        thumbnail: info.videoDetails.thumbnails.pop().url,
        qualities
      });
    }

    /* ---------- TIKTOK ---------- */
    if (platform === "TikTok") {
      const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const r = await axios.get(api);

      if (!r.data || !r.data.data)
        return res.status(500).json({ error: "TikTok fetch failed" });

      const d = r.data.data;

      return res.json({
        platform: "TikTok",
        title: d.title,
        author: d.author.nickname,
        thumbnail: d.cover,
        qualities: ["720p", "360p", "audio"]
      });
    }

    /* ---------- FACEBOOK ---------- */
    if (platform === "Facebook") {
      const api = `https://api.exfly.dev/fbdl?url=${encodeURIComponent(url)}`;
      const r = await axios.get(api);

      if (!r.data || !r.data.title)
        return res.status(500).json({ error: "FB fetch failed" });

      return res.json({
        platform: "Facebook",
        title: r.data.title,
        author: r.data.author || "Facebook User",
        thumbnail: r.data.thumbnail,
        qualities: ["1080p", "720p", "sd"]
      });
    }

    return res.json({ error: "Platform not supported" });

  } catch (e) {
    return res.status(500).json({ error: "Details unavailable" });
  }
});

/* ================= DOWNLOAD ================= */
app.get("/api/download", async (req, res) => {
  const { url, quality } = req.query;
  if (!url) return res.status(400).json({ error: "URL missing" });

  const platform = detectPlatform(url);

  try {
    /* ---------- YOUTUBE ---------- */
    if (platform === "YouTube") {
      const info = await ytdl.getInfo(url);

      if (quality === "audio") {
        res.header(
          "Content-Disposition",
          `attachment; filename="${info.videoDetails.title}.mp3"`
        );
        return ytdl(url, {
          filter: "audioonly",
          quality: "highestaudio"
        }).pipe(res);
      }

      res.header(
        "Content-Disposition",
        `attachment; filename="${info.videoDetails.title}.mp4"`
      );
      return ytdl(url, {
        filter: "audioandvideo",
        quality
      }).pipe(res);
    }

    /* ---------- TIKTOK ---------- */
    if (platform === "TikTok") {
      const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
      const r = await axios.get(api);

      const fileUrl =
        quality === "audio" ? r.data.data.music : r.data.data.play;

      const stream = await axios.get(fileUrl, { responseType: "stream" });

      res.header("Content-Disposition", `attachment; filename="tiktok.mp4"`);
      return stream.data.pipe(res);
    }

    /* ---------- FACEBOOK ---------- */
    if (platform === "Facebook") {
      const api = `https://api.exfly.dev/fbdl?url=${encodeURIComponent(url)}`;
      const r = await axios.get(api);

      const link =
        quality === "1080p" || quality === "720p"
          ? r.data.hd
          : r.data.sd;

      const stream = await axios.get(link, { responseType: "stream" });

      res.header("Content-Disposition", `attachment; filename="facebook.mp4"`);
      return stream.data.pipe(res);
    }

    return res.status(400).json({ error: "Platform not supported" });

  } catch (e) {
    return res.status(500).json({ error: "Download failed" });
  }
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 SenuzVid Backend Running on Port " + PORT);
});
