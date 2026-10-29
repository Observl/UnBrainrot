# 内容 JSON 交付契约 1.0

统一文档标识：`schema = unbrainrot.content-batch`，`schemaVersion = 1.0`。规范见 [JSON Schema](./content-batch.schema.json)。

抓取 → `collected.json` → 静态规则 → `rules.json` → 可选 AI workflow → `reviewed.json` → 网页。

同一个请求的三个阶段沿用同一 batchId 和原始发布时间。`createdAt` 是本批抓取生成时间，`items[].publishedAt` 才是文章发布时间。

每个条目保留原标题、来源、规范 HTTPS 原文地址、简介、封面、视频作者认证/粉丝/播放量及媒体元数据。`media.orientation` 为 landscape / portrait / square / unknown，缺尺寸时使用 null，不能从封面推断视频方向。

## JSON 文件交付

既有 `/api/search` 追加：

- `delivery=collected`：经过基本 URL/字段规范化的来源候选 JSON；尚未经过内容规则，不能直接渲染到推荐流。
- `delivery=rules`：静态规则通过的内容以及每个原始候选的保留/删除原因。
- `delivery=reviewed`（默认）：AI 二筛后的最终内容；未配置或失败时使用静态规则结果，`workflow.status` 标明 disabled / fallback，绝不表示 AI 已审核。
- `download=1`：同一个 JSON 文档以 `.json` 附件交付；平时使用 `application/json` 响应，避免网页必须先落盘再读取。

每次网络抓取产生独立批次。要比较同一批次的前后阶段，下载 collected JSON 后用离线规则工具或将该文档交给工作流；不要把分开的实时请求误认为同一批快照。

网页只读取 reviewed 格式并校验版本和唯一 ID；页脚 `JSON ↓` 导出最近一批返回的完整 JSON，不是所有已滚动页面的合并导出。JSON 文件不做永久云端归档；不会额外写入用户浏览器下载目录，只有点击下载才创建本地文件。

## 文件输入 / 文件输出的静态筛选

```sh
node scripts/filter-content-json.mjs collected.json rules.json
```

输出文件必须尚不存在，防止覆盖用户文件；输入、输出使用相同规范，保留 batchId。

## Dify 文件内容输入 / JSON 结果输出

更新后的 Dify 包仍使用 `payload` 字符串输入，填写 collected.json 或 rules.json 的完整 UTF-8 内容即可。服务器自动传递规则后的 JSON 文档，无须手动上传附件。

Dify 结束节点 `result` 是完整 reviewed 文档的 JSON 字符串，而不只是 decisions 数组。经 Dify API 返回后，网站后端解包、检查 batchId / 决策覆盖范围 / 输出 ID，并用已知来源条目生成最终 JSON 响应；模型不能改原文地址或复活已被默认规则删除的内容。旧版 version=1 决定接口仍兼容。

通过 HTTP 传输的是 JSON 文件内容，不依赖 Dify 私有文件 URL、multipart 上传或临时公开下载链接。新版包需重新导入并发布；现有 Dify 工作流不会被自动远程覆盖。

## 视频预览与图文封面

搜索若已有真实 width/height 则直接使用；否则点击播放时通过 `/api/video?bvid=...` 获取原视频 dimension。拿不到尺寸先用16:9，返回后按真实比例调整；竖屏播放器限制在视口高度内。不会根据封面裁切比例猜测视频比例。

图文阅读区顶部显示来源封面，没有封面或图片加载失败时使用内置占位 SVG。这是界面素材，不冒充原新闻封面。
