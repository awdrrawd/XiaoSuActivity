// ==UserScript==
// @name 小酥的动作拓展
// @namespace https://www.bondageprojects.com/
// @version 0.0.1
// @description 小酥的动作拓展 一些额外的动作
// @author XiaoSu
// @include  /^https:\/\/(www\.)?(bondage(projects\.elementfx|-(europe|asia))\.com|bondageeurope\.com)\/.*/
// @run-at document-end
// @grant none
// ==/UserScript==

(function() {
    'use strict';
    var script = document.createElement("script");
    script.langauge = "JavaScript";
    script.setAttribute("crossorigin", "anonymous");
    script.src = `https://awdrrawd.github.io/XiaoSuActivity/main/XSActivity.js?${Date.now()}`;
    document.head.appendChild(script);
})();
