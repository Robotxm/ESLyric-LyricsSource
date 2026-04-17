# ESLyric-LyricsSource

一些用于 ESLyric 的高级歌词源，将 KRC (酷狗)、QRC (QQ 音乐) 和 YRC (网易云音乐) 的逐字歌词和翻译歌词转换为 ESLyric 支持的格式。

**不要**在这里反馈任何与 ESLyric 插件相关的问题，我**不是**其作者，不对其负任何责任！

佛系更新，有问题**肯定不会**及时解决。

## 用哪个版本

## Legacy

如果你的 ESLyric 是老版本，用这里的文件。

仅酷狗支持逐字歌词和翻译歌词。

## Current

新版本 ESlyric 使用这里的文件。

酷狗、QQ 音乐和网易云音乐三个歌词源都支持逐字和翻译歌词。

注意从 0.3 版本的 QQ 音乐歌词源和解析器开始，依赖于 JavaScript 实现的 QRC 解密逻辑，而非 ESLyric 自带的，因此请确保将 `qrc` 目录下的 `lib` 目录内容也放到 ESLyric 对应的位置。

## 鸣谢

QRC 解密部分参考了 [LDDC](https://github.com/chenmozhijin/LDDC/) 项目。