import { conDebug, hookFunction, MSGType, registerSDK, bcModSDK } from "./utils";
import { ModuleLoader } from "Modules/ModuleLoader";
import { Localization } from "localization";

async function initWait() {
    if (window.XSActivity_Loaded || window.XSActivity_Loading) return;
    if (window.XSActivity_Error) {
        console.error("XiaoSuActivity previously failed during module setup; reload the page before retrying.", window.XSActivity_Error);
        return;
    }
    window.XSActivity_Loading = true;
    const deadline = Date.now() + 45000;
    while (typeof LoginResponse !== "function" || typeof TranslationSwitchLanguage !== "function") {
        if (Date.now() >= deadline) throw new Error("Game functions are not ready");
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    registerSDK();

    void Localization.init().catch(error => console.warn("Translation initialization failed; using bundled English:", error));
    conDebug({
        name: "Start Init",
        type: MSGType.Workflow_Log,
        content: "Init wait"
    });
    // 修改WombTattoos为非cosplay物品
    hookFunction('LoginResponse', 999, (args, next) => {
        const response = args[0];
        if (response && typeof response !== 'string' && typeof response.Name === 'string' && 'AccountName' in response) {
            for (const group of AssetFemale3DCG as AssetGroupDefinition.Appearance[]) {
                if (group.Group === 'ClothAccessory') {
                    for (const item of group.Asset as AssetDefinition.Appearance[]) {
                        if (item.Name === "WombTattoos") {
                            item.BodyCosplay = false;
                            break;
                        }
                    }
                    break;
                }
            }
        }
        return next(args);
    });

    let started = false;
    const start = () => {
        if (started) return;
        started = true;
        try { init(); }
        catch (error) { failInitialization(error, true); }
    };

    if (typeof Player !== "undefined" && Player?.MemberNumber !== undefined) {
        start();
        return;
    }

    const removeLoginHook = hookFunction('LoginResponse', 10, (args, next) => {
        const result = next(args);
        queueMicrotask(() => {
            if (typeof Player === "undefined" || Player?.MemberNumber === undefined) return;
            removeLoginHook();
            start();
        });
        return result;
    });
}

export function init() {
    if (window.XSActivity_Loaded || window.XSActivity_Error) return;

    const InitModuleCount = ModuleLoader.InitModules();

    conDebug({
        type: MSGType.Workflow_Log,
        name: "XSActivity Initialized!",
        content: `Init ${InitModuleCount} modules `
    });

    const moduleCount = ModuleLoader.LoadModules();

    conDebug({
        type: MSGType.Workflow_Log,
        name: "XSActivity Loaded!",
        content: `Loaded ${moduleCount} modules    FullLoaded: ${ModuleLoader.CompleteLoadingSuccessful}`
    });

    window.XSActivity_Loading = false;
    if (!ModuleLoader.CompleteLoadingSuccessful) {
        throw new Error("XSActivity load or init failed");
    }
}



function failInitialization(error: unknown, partial = false) {
    window.XSActivity_Loading = false;
    if (partial) window.XSActivity_Error = String(error);
    bcModSDK?.unload();
    console.error(partial
        ? "XiaoSuActivity initialization failed; reload the page before retrying:"
        : "XiaoSuActivity game readiness failed; loading again will retry:", error);
}

void initWait().catch(error => failInitialization(error, Boolean(bcModSDK)));
