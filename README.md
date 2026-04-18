# ESLyric-LyricsSource

一些用于 ESLyric 的高级歌词源，将 KRC (酷狗)、QRC (QQ 音乐) 和 YRC (网易云音乐) 的逐字歌词和翻译歌词转换为 ESLyric 支持的格式。

**不要**在这里反馈任何与 ESLyric 插件相关的问题，我**不是**其作者，不对其负任何责任！

佛系更新，有问题**肯定不会**及时解决。

## 用哪个版本

## Legacy

如果你的 ESLyric 是老版本，用这里的文件。

仅酷狗支持逐字歌词和翻译歌词。

## Current

新版本 ESLyric 使用这里的文件。

酷狗、QQ 音乐和网易云音乐三个歌词源都支持逐字和翻译歌词。

## 常见问题

### 为什么在 ESLyric 中搜索出来的歌词数量比对应音乐软件中要少？

ESLyric 的歌词匹配度逻辑就算在勾选了“显示所有歌词”之后也会生效，这个设置会影响歌词过滤逻辑，请考虑降低匹配度数值。

## 更新记录

Legacy 版本不再维护。

### 20260418

#### QRC 0.3

- 重新以 JavaScript 实现 QRC 解密逻辑，不再使用 ESLyric 自带库。请确保将 `qrc` 目录下的 `lib` 目录内容也放到 ESLyric 对应的位置
- 从 QRC 中获取歌曲名和歌手名用于填充搜索结果
- 不再输出空翻译行

#### KRC 0.2.1

- 不再输出空翻译行

#### YRC 0.3

- 更换网络请求 API，解决存在 YRC 逐字歌词但搜不到的问题
- 使用 `yrcjson` 中间格式

## 鸣谢

- QRC 解密部分参考了 [LDDC](https://github.com/chenmozhijin/LDDC/) 项目
- 网易云 API 部分参考了 [
lx-music-desktop](https://github.com/lyswhut/lx-music-desktop) 项目