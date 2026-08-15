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
            void Localization.getLangJson().then(() => {
                window.dispatchEvent(new CustomEvent("XSA:languageChanged"));
            });
            return result;
        })

        this.loadPromise = this.getLangJson();
        return this.loadPromise;
    }

    private static getCount = 0;
    private static async getLangJson(langCode?: string): Promise<void> {
        const L = langCode ? langCode : localStorage.getItem("BondageClubLanguage");
        const normalizedLanguage = (L ?? "EN").toUpperCase();
        const lang = normalizedLanguage === "CH"
            ? "CN"
            : this.SUPPORTED_LANGUAGES.has(normalizedLanguage) ? normalizedLanguage : "EN";

        const href = this.LINK + `${lang}.json`;
        const currentRequestId = ++this.requestId;

        conDebug("开始获取本地化文件.");
        conDebug(`获取地址: ${href}`);
        try {
            const response = await fetch(href);
            if (!response.ok) throw new Error(`HTTP ${response.status} while loading ${href}`);
            const data = await response.json() as IString;
            if (currentRequestId !== this.requestId) return;
            this.getCount = 0;
            this.STRINGS = data;
            window.XSA_STRINGS = this.STRINGS;
            conDebug({
                name: "本地化文件加载完成.",
                content: data
            });
        } catch (error) {
                if (currentRequestId !== this.requestId) return;
                if (/HTTP 4\d\d/.test(String(error))) {
                    this.getCount = 0;
                    console.error("获取翻译文件失败: ", error);
                    return;
                }
                this.getCount++;
                if (this.getCount < 3) {
                    console.error("获取翻译文件失败: ", error, "\n1秒后重新获取.");
                    setTimeout(() => {
                        void this.getLangJson(lang);
                    }, 1000);
                } else {
                    if (lang === "CN") console.error("获取翻译文件失败: ", error, "\n3次失败.")
                    else {
                        console.error("获取翻译文件失败: ", error, "\n3次失败, 尝试获取默认的中文翻译.");
                        void this.getLangJson("CN");
                    }
                }
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
