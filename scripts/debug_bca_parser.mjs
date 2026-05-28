import fs from "fs";
import path from "path";
import { parseBcaEmail } from "../src/lib/bcaParser.js";

const samplePath = path.resolve(
  process.cwd(),
  "scripts",
  "skipped_emails",
  "859d03fb-8869-4b50-888b-ad9eea5b5b3b-1779969734347.txt",
);
const txt = fs.readFileSync(samplePath, "utf8");
const result = parseBcaEmail(txt);
console.log("Parser result:", result);
