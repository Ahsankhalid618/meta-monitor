import { readFileSync } from "node:fs";
import {
  discoverGraphApiVersionUrls,
  discoverOutOfCycleUrls,
  parseGraphApiVersionPage,
} from "../src/collectors/changelog/parse.js";

const indexHtml = readFileSync("tmp-changelog.html", "utf8");
const v25Html = readFileSync("tmp-v25.html", "utf8");
const oocHtml = readFileSync("tmp-ooc.html", "utf8");

const versions = discoverGraphApiVersionUrls(
  indexHtml,
  "https://developers.facebook.com/docs/graph-api/changelog",
  3,
);
console.log("versions", versions);

const ooc = discoverOutOfCycleUrls(
  oocHtml,
  "https://developers.facebook.com/docs/graph-api/changelog/out-of-cycle-changes",
  3,
);
console.log("out-of-cycle", ooc);

const sections = parseGraphApiVersionPage(
  v25Html,
  "https://developers.facebook.com/docs/graph-api/changelog/version25.0",
);
console.log("v25 sections", sections.length);
for (const s of sections.slice(0, 3)) {
  console.log("-", s.title, "|", s.rawContent.slice(0, 80) + "...");
}
