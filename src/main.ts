import { conDebug, hookFunction, MSGType } from "./utils";
import { ModuleLoader } from "Modules/ModuleLoader";
import { Localization } from "localization";

function initWait() {
    if (window.XSActivity_Loaded || window.XSActivity_Loading) return;
    window.XSActivity_Loading = true;

    const localizationReady = Localization.init();
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

    const start = () => {
        void localizationReady.then(() => init()).catch((error) => {
            console.error("XiaoSuActivity initialization failed:", error);
        });
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
    if (window.XSActivity_Loaded) return;

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

    if (!ModuleLoader.CompleteLoadingSuccessful) {
        throw new Error("XSActivity load or init failed");
    }
}



initWait();
