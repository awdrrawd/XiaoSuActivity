# 动作拓展以及其他易用性功能
为 [Bondage Club](https://www.bondageprojects.elementfx.com/)制作的Mod。

- 详细功能查看以下看板:
  - [Trello](https://trello.com/b/wIleQnF7/xiaosuactivity)
- ~~当前功能:~~
  - ~~动作拓展: 增添若干自定义动作。 - [当前动作数量:28]~~
  - ~~结巴发言 => 将会在说话中添加结巴效果的命令，具体使用说明参考`/xsa jieba`~~
  - ~~导出聊天室聊天记录的命令 。- [具体帮助输入:`/xsa`]~~
  - 以上功能并不是全部功能 请查看[Trello](https://trello.com/b/wIleQnF7/xiaosuactivity)


## 安装方法:
**推荐使用Tampermonkey插件**
**测试版非必要请勿使用，编程水平有限，边学边写。测试版仅作为自己的实验室，出现bug的概率相当高!**

- Tampermonkey
  - 正式版: https://iceriny.github.io/XiaoSuActivity/main/userLoad.user.js
  - 测试版: https://iceriny.github.io/XiaoSuActivity/dev/userLoad_dev.user.js
- 书签:
```code
javascript:(()=>{fetch('https://iceriny.github.io/XiaoSuActivity/main/userLoad.user.js').then(r=>r.text()).then(r=>eval(r));})();
```

## 翻译协作说明: 
- 如果你想帮助完成你使用的语言的翻译，请提交一个PR，在`/translation/`目录下添加一个json文件，文件名格式为`XX.json`，`XX`为语言代码，例如`CN.json`。
- 你可以把现有的`CN.json`文件复制一份，然后修改文件名和其中的值，然后提交PR。
- json文件格式参考[/translation/CN.json](https://github.com/iceriny/XiaoSuActivity/blob/dev/translation/CN.json)。
- 如果你不知道你使用的语言的语言代码，请在游戏页面打开控制台(`F12`)，输入`TranslationLanguage`，然后返回的值就是你的语言代码。


## 初始化與背景翻譯

入口先檢查已載入／載入中旗標，再註冊 SDK；重複注入不會再次註冊。
遊戲函式未就緒時最多等待 45 秒，登入完成後使用內建英文啟動，翻譯 JSON
在背景下載；每次請求最多 30 秒、最多嘗試三次。成功後通知動作及聊天介面
更新；切換語言會取消舊請求，英文直接使用內建資料。

初始化失敗會清除 Loading 並卸載 SDK hooks。若模組已開始初始化，可能已修改
遊戲資料或安裝其他事件，因此保留 `window.XSActivity_Error`，要求重新整理頁面，
不在同一頁盲目重跑。這不是完整的插件熱卸載。

執行 `npm test` 驗證背景翻譯、重複載入與失敗狀態；`npm run build` 產生發布檔。
