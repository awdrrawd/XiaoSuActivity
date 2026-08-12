import fs from "node:fs";
import path from "node:path";

const translationDir = path.resolve(import.meta.dirname, "../translation");
const languages = ["TW", "CN", "EN", "DE", "FR", "RU", "UA"];
const source = JSON.parse(fs.readFileSync(path.join(translationDir, "EN.json"), "utf8"));
const chineseSource = JSON.parse(fs.readFileSync(path.join(translationDir, "CN.json"), "utf8"));

const keysOf = (value) => Object.entries(value)
    .flatMap(([section, entries]) => Object.keys(entries).map((key) => `${section}\0${key}`))
    .sort();
const tokensOf = (value) => (value.match(/\{\d+\}|<\/?span(?:\s[^>]*)?>/g) ?? []).sort();
const expectedKeys = keysOf(source);

for (const language of languages) {
    const candidate = JSON.parse(fs.readFileSync(path.join(translationDir, `${language}.json`), "utf8"));
    const tokenSource = language === "TW" || language === "CN" ? chineseSource : source;
    if (JSON.stringify(keysOf(candidate)) !== JSON.stringify(expectedKeys)) {
        throw new Error(`${language}: translation keys do not match EN.json`);
    }
    for (const [section, entries] of Object.entries(tokenSource)) {
        for (const [key, value] of Object.entries(entries)) {
            if (JSON.stringify(tokensOf(candidate[section][key])) !== JSON.stringify(tokensOf(value))) {
                throw new Error(`${language}: placeholder mismatch at ${section}.${key}`);
            }
        }
    }
    console.log(`${language}: ${expectedKeys.length} keys and placeholders OK`);
}
