import { conDebug, hookFunction } from "utils";
import EnglishStrings from "../translation/EN.json";

const BundledEnglishStrings = EnglishStrings as unknown as IString;

export class Localization {
    private static readonly LINK: string = DEBUG ? 'https://awdrrawd.github.io/XiaoSuActivity/dev/' : 'https://awdrrawd.github.io/XiaoSuActivity/main/'
    private static readonly SUPPORTED_LANGUAGES = new Set(["TW", "CN", "EN", "DE", "FR", "RU", "UA"]);
    public static STRINGS: IString = EnglishStrings as unknown as IString;
    private static initialized = false;
    private static loadPromise: Promise<void> | null = null;
    private static requestId = 0;

    public static init(): Promise<void> {
        if (this.initialized) return this.loadPromise ?? Promise.resolve();
        this.initialized = true;
        conDebug("本地化模块初始化.");
        hookFunction("TranslationSwitchLanguage", 0, (args, next) => {
            const result = next(args);
            void Localization.getLangJson().catch(error => console.warn("Translation refresh failed:", error));
            return result;
        })

        this.loadPromise = this.getLangJson();
        return this.loadPromise;
    }

    private static controller: AbortController | null = null;
    private static async getLangJson(langCode?: string): Promise<void> {
        const code = (langCode ?? localStorage.getItem("BondageClubLanguage") ?? "EN").toUpperCase();
        const lang = code === "CH" ? "CN" : this.SUPPORTED_LANGUAGES.has(code) ? code : "EN";
        const requestId = ++this.requestId;
        this.controller?.abort();
        const controller = this.controller = new AbortController();
        // Always provide usable strings immediately, including after a language switch.
        this.STRINGS = BundledEnglishStrings;
        window.XSA_STRINGS = this.STRINGS;
        window.dispatchEvent(new CustomEvent("XSA:languageChanged"));
        if (lang === "EN") return;
        const href = this.LINK + `${lang}.json`;
        for (let attempt = 0; attempt < 3; attempt++) {
            if (controller.signal.aborted) return;
            const request = new AbortController();
            const abort = () => request.abort();
            controller.signal.addEventListener("abort", abort, {once: true});
            const timer = setTimeout(abort, 30000);
            try {
                const response = await fetch(href, {signal: request.signal});
                if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${href}`);
                const data = await response.json() as IString;
                if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid translation JSON");
                if (requestId !== this.requestId) return;
                this.STRINGS = data;
                window.XSA_STRINGS = data;
                window.dispatchEvent(new CustomEvent("XSA:languageChanged"));
                return;
            } catch (error) {
                if (controller.signal.aborted || requestId !== this.requestId) return;
                console.warn("XiaoSuActivity translation download failed; using bundled English:", error);
                if (/HTTP 4\d\d/.test(String(error))) return;
            } finally {
                clearTimeout(timer);
                controller.signal.removeEventListener("abort", abort);
            }
            if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    public static get<T extends FirstStringKey>(firstKey: T, key: strKey<T>, ...param: unknown[]): string {
        return new STR(firstKey, key)
            .SlotReplace(...param)
            .Personalize()
            .S;
    }

}

class STR<T extends FirstStringKey> {
    private str: string;
    public get S(): string {
        return this.str;
    }

    public constructor(firstKey: T, key: strKey<T>) {
        if (Localization.STRINGS
            && Localization.STRINGS[firstKey]
            && Object.prototype.hasOwnProperty.call(Localization.STRINGS[firstKey], key)) {
            this.str = Localization.STRINGS[firstKey][key] as string;
        } else if (BundledEnglishStrings[firstKey]
            && Object.prototype.hasOwnProperty.call(BundledEnglishStrings[firstKey], key)) {
            // A hosted translation can briefly lag behind a new script build.
            this.str = BundledEnglishStrings[firstKey][key] as string;
        } else {
            this.str = "[STRING_RETRIEVAL_FAILED!!]";
        }
    }

    public SlotReplace(...param: unknown[]): STR<T> {
        this.str = this.str.replace(/\{([0-9]+)\}/g, (match, digits) => {
            const index = parseInt(digits, 10); // 将匹配到的数字字符串转换为数字索引
            try {
                return (param[index] as string).toString();
            } catch (error) {
                console.error(`Index ${index} out of range in parameters array.`, error);
                return match;
            }
        });
        return this;
    }

    public Personalize(): STR<T> {
        this.str = this.str.replace(/\{(he|her|it|they)\}/g, (match, pronoun) => {
            try {
                return Localization.STRINGS.Other[pronoun as strKey<'Other'>] as string;
            } catch (error) {
                console.error(`未获取到人称代词。`, error);
                return match;
            }
        });
        return this;
    }


}
