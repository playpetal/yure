require("dotenv").config();
import ffmpeg from "fluent-ffmpeg";
import express from "express";
import { requestSong } from "./lib/cache";
import { generateVideo } from "./lib/generate";
import { uploadVideo } from "./lib/upload";

const app = express();
app.use(express.json());

app.get("/health", async (_, res) => {
  return res.status(200).send({ message: "OK" });
});

app.get("/song", async (req, res) => {
  const id = parseInt(req.query.id as string, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "id must be a number" });
  }

  const path = await requestSong(id);
  let duration: number;

  try {
    duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(path, async (error, data) => {
        if (error) reject(error);
        resolve(parseInt(data.streams[0].duration!));
      });
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({
      error: "An error occurred while attempting to retrieve the song.",
    });
  }

  const max = Math.floor(duration - 10);
  const start = Math.floor(Math.random() * (max + 1));

  try {
    const buffer = await generateVideo(path, "./src/assets/bg.mp4", start);
    return res.status(200).json({ video: buffer.toString("base64") });
  } catch (e) {
    return res
      .status(500)
      .json({ error: "An error occurred while processing the song." });
  }
});

app.post("/upload", async (req, res) => {
  const { url, id } = req.body as { url: unknown; id: unknown };

  if (typeof url !== "string")
    return res.status(400).json({ error: "'url' must be a string", url: null });

  try {
    new URL(url);
  } catch (e) {
    return res
      .status(400)
      .json({ error: "'url' must be a valid url", url: null });
  }

  if (typeof id !== "number" || !Number.isInteger(id))
    return res
      .status(400)
      .json({ error: "'id' must be an integer", url: null });

  const location = await uploadVideo(url, id);

  return res.status(200).send({ error: null, url: location });
});

app.listen(3000);
