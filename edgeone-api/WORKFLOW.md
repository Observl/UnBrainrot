# 工作流接口与筛选模式

规范 JSON 见 [交付契约](../contracts/README.md)，Dify 包与配置见 [两轮筛选说明](../workflows/deepseek-filter/README.md)。

未配置 `CONTENT_WORKFLOW_URL`：抓取 → 默认规则 → reviewed JSON。

已配置 URL：抓取 → 规范化 collected JSON → workflow 独立筛选 → reviewed JSON。网站和网页不再追加默认内容规则。JSON/HTTPS/唯一ID/批次一致性检查仍保留。

启用 workflow 后调用失败不会切回默认规则，也不展示该批未审核内容；返回 `workflow.status=error`、空 items 和重试提示。

Dify 配置 `CONTENT_WORKFLOW_KIND=dify`，URL为HTTPS `/v1/workflows/run`，`CONTENT_WORKFLOW_TOKEN` 为应用 Key。输入 `inputs.payload` 是整个JSON文件内容，`response_mode=blocking`；结束节点输出 `result` 字符串，网站解包 `data.outputs.result`。Dify超时25秒。

通用 webhook 使用默认 kind=webhook，将同一规范文档直接 POST 到URL，请求头为可选 Bearer token，超时4秒。仍兼容 `version=1,decisions=[{id,keep}]` 响应。该兼容只影响序列化，不改变独立筛选模式。

所有决定必须覆盖当前输入ID且不能重复或新增；完整JSON输出必须保留batchId和受保留决定对应的items。最终内容取自原始来源，不接受模型改写链接。

状态：disabled（静态路径）、applied（workflow成功）、error（workflow失败，未采用默认规则）。
