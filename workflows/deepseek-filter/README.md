# UnBrainrot · 标题 → 简介两轮 AI 筛选

本版根据你提供的 Dify 包修改，沿用 `langgenius/siliconflow/siliconflow` 与 `deepseek-ai/DeepSeek-V4.1-Flash`，保留原 SiliconFlow 插件依赖；不导出或写入账号密钥。

## 流程

输入抓取 JSON → 仅校验 JSON 格式 → **模型第一轮只看标题** → 校验标题决定、提取通过项 → **模型第二轮结合简介与已有元数据判断** → 合并结果 JSON。

- 共有7个节点，2个原生 Dify LLM 节点，均已选同一个模型。
- 第一轮输入只有 id、kind、title 与查询上下文，不包含简介、作者或粉丝信息。
- 第二轮只收到第一轮保留的条目及其简介、来源、作者数据；不能复活标题阶段删除的条目。
- 没有默认规则代码、关键词预筛或静态内容过滤节点。代码节点只处理格式、ID覆盖、模型置信度与流程合并。
- 继续按你既有内容要求通过模型判断，标题不明朗但可能有价值可进入第二轮；简介缺失/证据不足由第二轮保守删除。标题阶段阈值0.65，简介阶段0.75，均为待校准的模型置信度，不代表真实性概率。

## 导入使用

1. 在 Dify 重新导入 `UnBrainrot Workflow - DeepSeek Flash.ifpkg` 或 `app.yaml`。
2. 在模型供应商设置中确认 SiliconFlow 账号已配置，并且 `DeepSeek-V4.1-Flash` 可用。沿用你的供应商凭据，不再要求在工作流中填写 `DEEPSEEK_API_KEY`。
3. 在测试运行的 `payload` 中填写 `sample-input.json` 的完整文本。逐节点检查两轮输出，再发布。
4. 网站服务端配置：

```dotenv
CONTENT_WORKFLOW_KIND=dify
CONTENT_WORKFLOW_URL=https://api.dify.ai/v1/workflows/run
CONTENT_WORKFLOW_TOKEN=你的Dify应用APIKey
```

自建 Dify 替换成自己的 HTTPS 地址。应用 Key 与 SiliconFlow 模型 Key 是不同凭据。

## 网站筛选路径

- **未配置 workflow URL**：使用现有默认静态规则。
- **已配置 workflow URL**：规范化抓取候选直接交给工作流，后台和网页都不再追加默认内容规则；仍保留 JSON/URL/ID 等格式安全校验。
- workflow 模式会为全部候选补充可查询到的作者信息，不先按默认标题、播放或粉丝规则删候选。作者信息无法查询时以未知交给工作流判断。
- workflow 失败或超时：不展示该批未审核候选，不悄悄回退静态规则，显示错误供重试。已通过前面批次的内容可以继续查看。
- workflow 模式下不提供 `delivery=rules`，可下载 collected 或 reviewed JSON。通用旧版 webhook 决定协议仍可使用，但网站最终选择路径遵循同一独立规则。

`result` 返回完整 reviewed JSON，包含 batchId、最终条目和逐条保留决定；`screeningStage` 标明在 title 或 description 阶段决定。每个候选都有唯一决定。网站只接收原始 ID，不能让模型新增条目或改写原始链接。

Dify 模式服务器请求超时25秒；网页请求55秒。两轮模型调用可能比单轮慢，真实延迟和模型成本需要用你的账号实测。

此版只依据标题、简介及公开元数据筛选，没有视频/全文事实核查。没有在你的 Dify 实例进行真实模型调用；导入后需要发布，网站不会远程自动替换你账号里的工作流。

## 维护

在项目根目录运行 `node workflows/deepseek-filter/build.mjs` 重建 DSL。`provider.json` 只存非敏感模型/插件标识，`system-prompt.txt` 为两轮共同内容标准。

## 页面 Dify 对接参数更新

页面填写基础地址 https://api.dify.ai/v1、Dify应用Key、输入变量payload、输出变量result。当前包已移除播放量要求；作者认证与粉丝要求仍由Dify判断。需要重新导入并发布以更新旧流程的筛选指令。网站不再提供直接模型API选项，包内部模型由Dify管理。
