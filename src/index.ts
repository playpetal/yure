require("dotenv").config();
import ffmpeg from "fluent-ffmpeg";
import express from "express";
import { S3 } from "./lib/S3";
import { PassThrough } from "stream";
import hashids from "hashids";

if (
  !process.env.S3_ENDPOINT ||
  !process.env.S3_ACCESS_KEY ||
  !process.env.S3_SECRET_KEY
)
  throw new Error("Invalid S3 credentials");

const hash = new hashids(process.env.SALT || "NO_SALT_SPECIFIED");
let count = 0;

async function run(start: number, duration: number, song: string) {
  const pass = new PassThrough();

  const num = count + Date.now();
  count++;

  const id = hash.encode(num);

  ffmpeg("./src/assets/bg.png")
    .inputOptions(["-loop 1"])
    .input(song)
    .setStartTime(start)
    .setDuration(duration)
    .outputOptions([
      "-c:v libx264",
      "-tune stillimage",
      "-c:a aac",
      "-b:a 192k",
      "-pix_fmt yuv420p",
      "-shortest",
      "-f mp4",
      "-movflags frag_keyframe+empty_moov",
    ])
    .audioFilters([
      { filter: "volume", options: { volume: "0.1" } },
      { filter: "afade", options: `t=in:st=0:d=${duration / 10}` },
      {
        filter: "afade",
        options: `t=out:st=${duration - duration / 10}:d=${duration / 10}`,
      },
    ])
    .on("error", (...a) => {
      console.log(a);
      throw new Error("An unexpected error occurred.");
    })
    .pipe(pass);

  const params: AWS.S3.PutObjectRequest = {
    Bucket: "petal",
    Key: `gts/${id}.mp4`,
    Body: pass,
    ContentType: "video/mp4",
    ACL: "public-read",
  };

  const url: string = await new Promise((res, reject) => {
    S3.upload(params, (err, data) => {
      if (err) reject(err);
      res(data.Location);
    });
  });
  return url;
}

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

  const song = `https://cdn.playpetal.com/songs/${id}.m4a`;

  let duration: number;

  try {
    duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(song, async (error, data) => {
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
    const url = await run(start, 10, song);
    return res.status(200).json({ url });
  } catch (e) {
    return res
      .status(500)
      .json({ error: "An error occurred while processing the song." });
  }
});

app.listen(3000);
