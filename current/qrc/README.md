# QQ 音乐 Ex

复制 `parser`、`searcher` 和 `lib` 三个文件夹到 ESLyric 的 `scripts` 文件夹下。

## 为什么会有 `qrcjson`？

为了能够在一次过程中同时处理原始歌词和翻译歌词所采用的中间格式。

## 为什么某些音乐在 QQ 音乐中有翻译歌词，但在 ESLyric 中使用本仓库的脚本之后也没有？

QQ 音乐对于歌词翻译的处理规则相对复杂，本仓库的脚本无法处理所有情况。

## 为什么需要 `qrc-decryptor.js`？

ESLyric 自带的 QRC 的解密工具对于某些歌词不能正确处理，因此参考 [LDDC](https://github.com/chenmozhijin/LDDC/) 重新实现了一个纯 JavaScript 的版本。

## 为什么搜索出来的歌词数量比 QQ 音乐中要少？

ESLyric 的歌词匹配度逻辑就算在勾选了“显示所有歌词”之后也会生效，请考虑降低匹配度数值。
