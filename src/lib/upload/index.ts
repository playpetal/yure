import youtubedl from "youtube-dl-exec";
import path from "path";
import { S3 } from "../S3";
import { readFile } from "fs/promises";

export async function uploadVideo(
  url: string,
  songId: number
): Promise<string> {
  const filepath = path.join("./cache", `${songId}.m4a`);

  await youtubedl(url, { format: "140", output: filepath });

  const file = await readFile(filepath);

  const location: string = await new Promise((resolve, reject) => {
    S3.upload(
      {
        Bucket: "petal",
        Key: `${process.env.UPLOAD_KEY || "songs"}/${songId}.m4a`,
        Body: file,
        ACL: "public-read",
      },
      (error, data) => {
        if (error) reject(error);
        resolve(data.Location);
      }
    );
  });

  return location;
}
