import axios from "axios";
import { readFile, writeFile } from "fs/promises";
import path from "path";

export async function requestSong(id: number): Promise<string> {
  const filepath = path.join("./cache", `${id}.m4a`);

  try {
    await readFile(filepath);
    return filepath;
  } catch (e) {
    const inputRequest = await axios.get(
      `https://cdn.playpetal.com/songs/${id}.m4a`,
      {
        responseType: "arraybuffer",
      }
    );

    let buf = Buffer.from(inputRequest.data, "binary");

    await writeFile(filepath, buf);
    return filepath;
  }
}
