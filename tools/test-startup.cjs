const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const flush = () => new Promise(resolve => setImmediate(resolve));
const compile = file => '(function(){' + ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true},
}).outputText + '})();';

test('main starts without waiting for translation and duplicate injection never registers twice', async () => {
    let registrations = 0, initializations = 0;
    const window = {};
    const utils = {conDebug(){}, MSGType:{}, hookFunction(){return ()=>{}}, registerSDK(){registrations++}};
    const context = vm.createContext({window, exports:{}, console, LoginResponse(){}, TranslationSwitchLanguage(){},
        Player:{MemberNumber:1}, queueMicrotask, require(name) {
            if (name === './utils') return utils;
            if (name === 'localization') return {Localization:{init:()=>new Promise(()=>{})}};
            return {ModuleLoader:{InitModules(){initializations++;return 7}, LoadModules(){window.XSActivity_Loaded=true;return 7},CompleteLoadingSuccessful:true}};
        }});
    const code = compile('src/main.ts');
    vm.runInContext(code, context); await flush();
    assert.equal(initializations, 1);
    assert.equal(window.XSActivity_Loading, false);
    vm.runInContext(code, context); await flush();
    assert.equal(registrations, 1);
});

test('partial module failure clears loading, unloads hooks and blocks unsafe re-injection', async () => {
    let unloads = 0, attempts = 0;
    const window = {};
    const context = vm.createContext({window, exports:{}, console:{error(){}}, LoginResponse(){}, TranslationSwitchLanguage(){},
        Player:{MemberNumber:1}, queueMicrotask, require(name) {
            if (name === './utils') return {conDebug(){},MSGType:{},hookFunction(){return ()=>{}},registerSDK(){},bcModSDK:{unload(){unloads++}}};
            if (name === 'localization') return {Localization:{init:()=>Promise.resolve()}};
            return {ModuleLoader:{InitModules(){attempts++;throw Error('broken hook')}}};
        }});
    const code = compile('src/main.ts');
    vm.runInContext(code, context); await flush();
    assert.equal(window.XSActivity_Loading, false);
    assert.match(window.XSActivity_Error, /broken hook/);
    assert.equal(unloads, 1);
    vm.runInContext(code, context); await flush();
    assert.equal(attempts, 1);
});

test('translation timeout falls back, successful background retry refreshes, and stale language responses cannot win', async () => {
    const hooks = {}, timers = new Map(), requests = [], events = [];
    let language = 'TW';
    const english = JSON.parse(fs.readFileSync('translation/EN.json', 'utf8'));
    const context = vm.createContext({exports:{}, DEBUG:false, AbortController,
        console:{warn(){}}, CustomEvent: class {constructor(type){this.type=type}},
        window:{dispatchEvent(event){events.push(event.type)}},
        localStorage:{getItem(){return language}},
        setTimeout(fn, delay){timers.set(fn, delay);return fn},clearTimeout(fn){timers.delete(fn)},
        fetch(url, {signal}) {return new Promise((resolve,reject)=>{
            requests.push({url, resolve, signal});
            signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});
        })},
        require(name){return name==='utils' ? {conDebug(){},hookFunction(name,_priority,fn){hooks[name]=fn}} : english},
    });
    vm.runInContext(compile('src/localization.ts'),context);
    const localization=context.exports.Localization;
    const first=localization.init();
    assert.equal(localization.STRINGS,english);
    assert.equal(requests.length,1);
    const timeout=[...timers].find(([,delay])=>delay===30000)[0];
    timers.delete(timeout);timeout();await flush();
    assert.equal(requests[0].signal.aborted,true);
    const retry=[...timers].find(([,delay])=>delay===1000)[0];
    timers.delete(retry);retry();await flush();
    const tw={Other:{he:'繁中'}};
    requests[1].resolve({ok:true,json:async()=>tw});await first;
    assert.equal(localization.STRINGS,tw);
    language='CN';hooks.TranslationSwitchLanguage([],()=>{});await flush();
    language='EN';hooks.TranslationSwitchLanguage([],()=>{});await flush();
    assert.equal(requests[2].signal.aborted,true);
    requests[2].resolve({ok:true,json:async()=>({Other:{he:'old'}})});await flush();
    assert.equal(localization.STRINGS,english);
    assert.ok(events.length>=3);
    assert.equal(timers.size,0);
});
