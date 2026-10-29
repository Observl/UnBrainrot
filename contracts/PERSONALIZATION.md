# 个性化发现与页面 AI 配置

## 刷新去重

发现模式不再固定从“认知科学”的第一页开始。每次进入/换一批按主题轮换检索词和源站页码，图文池也按本轮种子重排。显式输入搜索词时保持搜索模式，不隐藏以前看过的相关结果。

卡片实际进入视口达到35%时，记录其ID和规范URL；近期记录保存在当前浏览器 localStorage，保留7天、最多700条。请求只携带最近240个排除标识，服务器在组装候选时排除，并排除本次滚动中已经加载的条目。记录仅用于本站去重，不作为AI输入；模型只收到当前待筛候选。

- `↻`：换一批；不清除已看记录。
- 内容耗尽时不悄悄循环旧条目，显示空状态；可手动选择“重新浏览已看内容”清空这份去重记录。
- 已看记录与收藏/足迹独立，清除去重不会删除收藏。
- RSS订阅和上游搜索本身有限，不能保证每次都有全新内容；轮换和去重用于减少重复，不伪造新条目。

## AI 配置按钮

网页右上角“AI 配置”支持：

1. 沿用网站设置：使用服务端已有工作流；没有配置时使用默认规则。
2. 只用默认规则：当前页面显式关闭AI，不改变其他用户设置。
3. Dify workflow：填写Dify应用Key；默认地址 `https://api.dify.ai/v1/workflows/run`。
4. SiliconFlow：填写对应平台Key与模型ID，默认 `deepseek-ai/DeepSeek-V4.1-Flash`。
5. DeepSeek：填写官方API Key与模型ID，默认 `deepseek-flash`。

直接模型模式也进行两轮筛选：先标题，再对通过项判断简介与元数据；不先跑默认规则。未通过/调用失败不切回默认规则。模型供应商或具体模型是否对账号可用，需由使用者用自己的Key确认；本次未调用真实模型验证。

应用配置会重新加载内容，并可能产生模型调用费用。Key只存在当前页面内存；刷新/关闭后清除。应用不把Key写入localStorage、URL、JSON导出文件、仓库或公开资源；不在应用日志中打印Key。当前请求通过HTTPS交给本站Cloudflare入口、EdgeOne后端，再转发所选服务。公共网页不提供全站配置写入接口，各用户配置相互隔离。

支持Dify Cloud；自建Dify需要管理员把精确域名加入EdgeOne环境变量 `AI_WORKFLOW_ALLOWED_HOSTS`（逗号分隔），只允许HTTPS443和 `/v1/workflows/run`，不接受查询串或重定向。直接模型的域名固定为 DeepSeek/SiliconFlow 官方API，不能把Key任意转发给其他域名。

## 请求契约

兼容原有GET；新版网页使用POST `/api/search`：

```json
{
  "params": {"q":"意识 认知科学","page":2,"topic":"全部","source":"all","discovery":"1","minViews":"10000","seed":"全部:8","excludeIds":["已看ID"]},
  "ai": {"provider":"dify","endpoint":"https://api.dify.ai/v1/workflows/run","key":"在页面输入，不写入文件"}
}
```

ai可省略；也可使用provider=static/deepseek/siliconflow。POST响应始终no-store，个性化内容和Key不通过共享缓存交付。规范化collected/reviewed JSON及原工作流契约保持兼容，返回JSON不含请求的ai配置。

## 本次检查范围

按要求未运行测试，也未执行模型调用或连接测试。只进行语法/构建检查和部署。GitHub Pages推送部署跳过测试步骤，手动workflow_dispatch才运行已有测试。

## 抓取时筛选的位置

AI配置用于后端抓取管线。浏览器只向本站发送本次抓取参数与会话配置；EdgeOne先抓取候选，在服务端完成标题和简介两轮筛选，再返回reviewed JSON。浏览器不调用模型API，也不先展示未筛选候选；新结果不再补跑浏览器端默认内容规则。页面中的AI按钮只负责配置这条后端管线。
