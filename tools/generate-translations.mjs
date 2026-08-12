import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const translationDir = path.join(root, "translation");
const english = JSON.parse(await fs.readFile(path.join(translationDir, "EN.json"), "utf8"));
const chinese = JSON.parse(await fs.readFile(path.join(translationDir, "CN.json"), "utf8"));

const targets = [
    ["TW", "zh-CN", "zh-TW", chinese],
    ["DE", "en", "de", english],
    ["FR", "en", "fr", english],
    ["RU", "en", "ru", english],
    ["UA", "en", "uk", english],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function flatten(source) {
    return Object.entries(source).flatMap(([section, values]) =>
        Object.entries(values).map(([key, value]) => ({ section, key, value }))
    );
}

function chunksOf(entries, maxLength = 3200) {
    const chunks = [];
    let chunk = [];
    let length = 0;
    for (const entry of entries) {
        if (entry.value === "") continue;
        const extra = entry.value.length + 32;
        if (chunk.length && length + extra > maxLength) {
            chunks.push(chunk);
            chunk = [];
            length = 0;
        }
        chunk.push(entry);
        length += extra;
    }
    if (chunk.length) chunks.push(chunk);
    return chunks;
}

function marker(index) {
    return `\uE000XSA_${index}\uE001`;
}

async function translateChunk(entries, sourceLanguage, targetLanguage) {
    const input = entries.map((entry, index) => `${marker(index)}\n${entry.value}`).join("\n");
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.search = new URLSearchParams({ client: "gtx", sl: sourceLanguage, tl: targetLanguage, dt: "t", q: input });

    let lastError;
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const payload = await response.json();
            const translated = payload[0].map((part) => part[0]).join("");
            const result = new Map();
            const pattern = /\uE000XSA_(\d+)\uE001\s*\n?/g;
            const matches = [...translated.matchAll(pattern)];
            if (matches.length !== entries.length) throw new Error(`marker mismatch: ${matches.length}/${entries.length}`);
            for (let i = 0; i < matches.length; i++) {
                const start = matches[i].index + matches[i][0].length;
                const end = i + 1 < matches.length ? matches[i + 1].index : translated.length;
                result.set(Number(matches[i][1]), translated.slice(start, end).trimEnd());
            }
            return result;
        } catch (error) {
            lastError = error;
            await sleep(750 * (attempt + 1));
        }
    }
    throw lastError;
}

function tokens(value) {
    return [...value.matchAll(/\{\d+\}|<\/?span(?:\s[^>]*)?>/g)].map((match) => match[0]).sort();
}

for (const [fileCode, sourceLanguage, targetLanguage, source] of targets) {
    const entries = flatten(source);
    const output = structuredClone(source);
    for (const chunk of chunksOf(entries)) {
        const translations = await translateChunk(chunk, sourceLanguage, targetLanguage);
        for (let i = 0; i < chunk.length; i++) {
            const entry = chunk[i];
            const translated = translations.get(i);
            if (translated == null) throw new Error(`${fileCode}: missing translation for ${entry.section}.${entry.key}`);
            if (tokens(translated).join("|") !== tokens(entry.value).join("|")) {
                throw new Error(`${fileCode}: placeholder mismatch for ${entry.section}.${entry.key}`);
            }
            output[entry.section][entry.key] = translated;
        }
        await sleep(150);
    }

    const languageCodes = { TW: "zh", DE: "de", FR: "fr", RU: "ru", UA: "uk" };
    output.Other.cn = languageCodes[fileCode];
    output.Other.en = languageCodes[fileCode];
    await fs.writeFile(path.join(translationDir, `${fileCode}.json`), `${JSON.stringify(output, null, 4)}\n`, "utf8");
    console.log(`Generated ${fileCode}.json (${entries.length} keys)`);
}
