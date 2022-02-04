import { spawn } from "child_process";
import { Writable } from "stream";

export async function generateVideo(audio: string, bg: string, seek: number) {
  const buffers: Buffer[] = [];

  const writable = new Writable({
    write(chunk, _encoding, callback) {
      buffers.push(chunk);
      callback();
    },
  });

  const child = spawn("ffmpeg", [
    `-ss`,
    `${seek}`,
    "-t",
    "10",
    "-i",
    audio,
    "-filter_complex",
    "[0:a]volume=0.1[vol];[vol]afade=t=in:st=0:d=1[fadein];[fadein]afade=t=out:st=9:d=1",
    "-i",
    bg,
    "-c:v",
    "copy",
    "-map",
    "1:v:0",
    "-map",
    "0:a:0",
    "-f",
    "mp4",
    "-movflags",
    "frag_keyframe+empty_moov",
    "pipe:1",
  ]);

  child.stdout.pipe(writable);

  const buf: Buffer = await new Promise((res, rej) => {
    writable.on("close", () => {
      res(Buffer.concat(buffers));
    });
  });

  return buf;
}
