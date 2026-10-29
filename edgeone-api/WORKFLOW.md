# AI 内容筛选接口 v1

现有默认规则保持不变。处理顺序：抓取 → 默认规则/搜索相关度 → 混排 → 可选 AI workflow → 返回网页。

## 配置

在 EdgeOne 项目的服务端环境变量中设置并重新部署：

- `CONTENT_WORKFLOW_URL`：你自己的 HTTPS webhook 完整地址。
- `CONTENT_WORKFLOW_TOKEN`：可选密钥，使用 `Authorization: Bearer <token>` 发送。

未设置 URL 时不调用外部服务，线上行为保持默认筛选。密钥不要写进前端、URL 或 Git 仓库。只配置你控制的可信公网服务；请求不跟随重定向。

## 请求

API 向 webhook 发送 `POST` JSON，每次处理当前页的候选内容，不发送用户收藏或足迹。当前接入仅提供公开元数据，没有视频字幕或文章全文。

```json
{
  "version": "1",
  "context": {"query": "意识", "page": 1, "discovery": false, "minViews": 10000},
  "items": [
    {"id": "BVxxxxxxxxxx", "kind": "video", "title": "原标题", "description": "来源简介", "source": "B站", "author": "作者", "url": "https://www.bilibili.com/video/BVxxxxxxxxxx/", "tags": "认知", "topic": "心理与认知", "views": 25000, "duration": 600}
  ]
}
```

文章 `kind` 为 `article`，播放量及视频时长可为 `null`。ID 是不透明字符串，必须原样返回。

## 响应

返回 HTTP 200 和 JSON；为每一个输入 ID 返回且仅返回一条决定：

```json
{"version":"1","decisions":[{"id":"BVxxxxxxxxxx","keep":true}]}
```

`keep` 必须是布尔值。可以全部删除。未知、重复、遗漏 ID 或格式不符会使整批回退到默认结果。workflow 不能添加内容、修改原标题/地址或放宽硬规则；原有排序保持不变。

通用 webhook 请求超时为 4 秒，Dify 模式为 15 秒，均不重试。超时、服务故障或格式异常时回退默认规则，并在 API `warnings` 中返回提示；不会把内部错误或密钥发给浏览器。

搜索 API 追加：

```json
{"workflow":{"status":"disabled","filtered":0}}
```

`status` 可为 `disabled`（未配置）、`applied`（成功）、`fallback`（故障回退）。`filtered` 是 AI 额外排除的数量，总 `filtered` 包含默认规则及 AI 排除数。分页以原始来源为准，AI 过滤后某页可能为空，后续页仍可能有内容。

配置 URL 后 EdgeOne 响应使用 `no-store`。现有 Cloudflare 入口最多缓存 60 秒；配置变更可能需等待缓存过期。

## 接入检查

先让 workflow 原样为所有 ID 返回 `keep:true`，再加入模型判断。内容标题和简介均是不可信来源数据，不应被 workflow 当作指令执行。模型输出应由 workflow 转成上述严格 JSON，而不是直接返回自由文本。

## Dify / DeepSeek 工作流

可导入包、节点源码、测试输入及密钥配置见 [工作流说明](../workflows/deepseek-filter/README.md)。使用 `CONTENT_WORKFLOW_KIND=dify` 对接 Dify `/v1/workflows/run`；默认仍为原有 webhook 协议。

## 标准化 JSON 文档管线

现支持 collected / rules / reviewed 文件内容交付与下载，Dify 可返回完整 reviewed JSON。模型决定仍以输入 ID 为准，不能新增来源条目。规范、Schema、离线静态筛选入口和新版包见 [交付说明](../contracts/README.md)。旧版 version=1 仅 decisions 的响应仍兼容。
