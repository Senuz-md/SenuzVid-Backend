// server.js — SenuzVid Ultra Stable Edition (No More Heroku Errors)

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// සර්වර් එකේ සජීවී බව පරීක්ෂා කිරීමට
app.get("/", (req, res) => res.send("SenuzVid Engine is Online & Stable! 🚀"));

/* ================= DOWNLOAD LOGIC (COBALT & TIKWM) ================= */
app.get("/api/download", async (req, res) => {
    const { url, quality } = req.query;
    if (!url) return res.status(400).send("URL missing");

    try {
        // 1. TIKTOK නම් TikWM භාවිතා කරමු (එය ඉතා වේගවත් නිසා)
        if (url.includes("tiktok.com") || url.includes("vm.tiktok")) {
            const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
            const d = r.data.data;
            const dlLink = (quality === "audio") ? d.music : (d.hdplay || d.play);
            return res.redirect(dlLink);
        }

        // 2. YOUTUBE, FB, IG සඳහා COBALT ENGINE එක භාවිතා කරමු (Stable & No Blocks)
        const cobaltResponse = await axios.post('https://api.cobalt.tools/api/json', {
            url: url,
            videoQuality: quality === "audio" ? "720" : quality, // Quality Mapping
            downloadMode: quality === "audio" ? "audio" : "video",
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (cobaltResponse.data && cobaltResponse.data.url) {
            return res.redirect(cobaltResponse.data.url);
        } else {
            throw new Error("Could not fetch link from engine.");
        }

    } catch (e) {
        console.error("Engine Error:", e.message);
        res.status(500).send("Application Error: සර්වර් එකේ තදබදයක්. පසුව උත්සාහ කරන්න.");
    }
});

/* ================= DETAILS API ================= */
app.get("/api/details", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "URL missing" });

    try {
        // TikTok Details
        if (url.includes("tiktok.com")) {
            const r = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
            const d = r.data.data;
            return res.json({
                platform: "TikTok",
                title: d.title || "TikTok Video",
                author: d.author.nickname,
                thumbnail: d.cover,
                qualities: ["1080p", "720p", "audio"]
            });
        }

        // YouTube/Other Details using Cobalt Meta
        return res.json({
            platform: "Universal",
            title: "Ready to Download",
            author: "SenuzVid",
            thumbnail: "https://files.catbox.moe/1dlcmm.jpg",
            qualities: ["1080p", "720p", "480p", "audio"]
        });

    } catch (e) {
        res.status(500).json({ error: "Details not found" });
    }
});

// Port Handling for Heroku
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Engine running on port ${PORT}`));
