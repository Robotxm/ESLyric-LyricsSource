# 网易云音乐 Ex

复制 `parser` and `searcher` 两个文件夹到 ESLyric 的 `scripts` 文件夹下。

## 为什么使用 `yrcjson`？

`yrc` 是网易云音乐新提出的逐字歌词文件格式，类似酷狗音乐的 `krc`。

但在存放方式上又与 QQ 音乐类似，歌词原文和译文分开存放，因此同样是为了能一趟解析，引入了中间格式 `yrcjson`。
