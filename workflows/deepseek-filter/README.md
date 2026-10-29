# UnBrainrot · DeepSeek V4.1 Flash 筛选工作流

基于你提供的空 Dify `.ifpkg` 包搭建，DSL 版本保留 `0.7.0`。五个节点：

输入候选 JSON → 默认规则复核 → DeepSeek V4.1 Flash → 决定格式校验 → 返回结果。

## 导入与试用

1. 在 Dify 导入同目录的 `UnBrainrot Workflow - DeepSeek Flash.ifpkg`；也可直接导入 `app.yaml`。
2. 在该工作流的环境变量中填写 Secret 类型的 `DEEPSEEK_API_KEY`。这不是 Dify 应用 API Key。
3. 打开“测试运行”，将 `sample-input.json` 的完整内容粘贴到 `payload` 输入框。
4. 检查 `result` 的逐条 `keep`，以及 `audit` 的原因码和置信度，然后发布工作流。
5. 在 Dify 为此应用创建应用 API Key，用于下一步网站调用。

使用 HTTP 节点直接调用 DeepSeek 官方 API，所以不依赖额外模型插件或模型列表同步。官方模型 ID 是 `deepseek-flash`，当前对应 V4.1 Flash；关闭思考、不开流式输出、JSON 模式，每批最多32条。模型代号以后可能映射到更新版本，不能承诺永久锁定同一权重。

## 网站接入

现有 API 已增加 Dify 协议支持。设置 EdgeOne 的服务端环境变量，再重新部署：

```dotenv
CONTENT_WORKFLOW_KIND=dify
CONTENT_WORKFLOW_URL=https://api.dify.ai/v1/workflows/run
CONTENT_WORKFLOW_TOKEN=你的Dify应用APIKey
```

自建 Dify 请换成自己的 HTTPS `/v1/workflows/run` 地址。DeepSeek API Key 只填在 Dify 内，网站只持有 Dify 应用 Key。

网站向 Dify 发送 blocking 请求，`inputs.payload` 包含候选公开元数据；不发送收藏、浏览足迹和用户身份。结束节点 `result` 为 JSON 字符串，网站会解包 `data.outputs.result` 并再次校验 ID。

未设置 URL 时 AI 不启用；调用失败、超过15秒或格式异常仍使用现有默认结果并显示提示，不会假装 AI 已审核成功。Dify 内部 HTTP 节点读超时12秒，不自动重试。此版是同步 MVP；真实延迟和调用成本需要用你的账号实测，当前没有调用真实模型或配置密钥。

## 筛选策略

- 保留人文文化、严肃哲学、心理认知、前沿科学、科技伦理、中西经典文学及文学批评。
- 新闻只保留财经、商业事实报道，排除政治、事故、明显立场评论、预测荐股及营销。
- 排除趣味问答、成人恶搞、低价值娱乐、历史、基础教育、大学数学、课程合集录播及考试辅导。
- 视频继续要求作者认证、粉丝严格超过1万、播放量至少1万（或用户更高门槛）。图文不受视频门槛影响。
- 对每个候选输出保留/删除与原因。保留要求理由为 `relevant_depth` 且置信度至少0.75；阈值是起始设置，需用标注样本校准。
- 模型不能恢复默认规则已删除的内容，不能新增条目、改变原始 URL 或标题。

此版只阅读标题、简介、标签、来源等元数据，没有下载视频、字幕或全文，也没有外部事实核查。认证、粉丝和模型置信度都不能保证真实性；不把任何媒体预设为绝对无偏见。含恶意指令的标题作为数据处理，不作为工作流命令。

## 文件

- `app.yaml` / `.ifpkg`：导入 Dify。
- `system-prompt.txt`：筛选标准。
- `prepare.js` / `validate.js`：两个代码节点，便于审查和测试。
- `sample-input.json`：测试输入。
- `build.mjs`：在项目根目录运行 `node workflows/deepseek-filter/build.mjs` 重建 DSL；默认规则取自现有 `web/dist/knowledge.js`。

已验证代码节点、输入输出契约、硬规则、低置信度处理和 Dify API 适配，未在你的 Dify 实例上完成导入及真实模型联调。

官方依据：[DeepSeek API 模型标识](https://api-docs.deepseek.com/)、[JSON 输出](https://api-docs.deepseek.com/guides/json_mode/)。

## 规范 JSON 文档交付（更新）

当前包接受规范化内容文档（schemaVersion 1.0），结束节点 result 返回完整 reviewed JSON：含 batchId、内容、分页及逐条决定；也保留旧版 version=1 输入兼容。塔罗、占卜与非科学预测已加入硬规则及模型标准。详见 [交付契约](../../contracts/README.md)。更新后需要在 Dify 重新导入并发布，现有账号内的工作流不会自动改变。
