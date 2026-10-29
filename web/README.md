# UnBrainrot MVP 0.2

黑绿主题的 B站知识视频入口。保留原标题、原封面和 UP 主，点击卡片在本站打开官方嵌入播放器，支持分集与简介阅读；只有主动点击「原视频」才打开外站。

## 本地运行

需要 Node.js 22 或更新版本：在 web 目录执行 `npm start`，打开 http://127.0.0.1:4173 。执行 `npm test` 运行筛选、元数据校验、搜索和目录完整性测试；执行 `npm run sync` 刷新公开内容索引。

## 两种部署

- GitHub Pages：部署 `web/dist`。前端托管在此，通过 `dist/config.js` 连接 Cloudflare Worker 实时搜索后端。Actions 每次部署刷新公开元数据，风控失败保留已有索引。未设置定时刷新。搜索覆盖的范围会显示在页面上。
- Cloudflare Workers：根目录执行 `npx wrangler deploy --config wrangler.jsonc`；发布 Worker API 和静态网页。已部署地址：https://unbrainrot-knowledge.griffonage2077.workers.dev 。GitHub 前端允许跨域调用，其他来源拒绝。
- Vercel：导入此仓库，使用根目录 `vercel.json`。静态输出目录为 `web/dist`，`api/search.mjs` 提供搜索后端。Node.js 22，无需密钥。页面允许切换「目录 / 实时」；实际部署需由有 Vercel 访问权限的账号完成。
- 本地 Node 服务同样提供 `/api/search?q=关键词&page=1`。仅在提交搜索时请求上游，缓存 5 分钟，上游风控或超时返回明确错误，前端切回索引。

## 知识筛选

采用可查看的标题、标签、分区关键词规则，排除明确的娱乐标题。固定种子目录经过人工选择，其余来自公开搜索结果。规则在 `dist/knowledge.js` 中；存在漏筛和误筛，不执行事实核验，不保证学习效果。搜索结果不根据播放时长诱导无限加载，每页展示 6 项。

## 播放与阅读

使用 [B站官方外链播放器](https://player.bilibili.com/)，不代理视频流，不下载或移除平台保护。默认关闭自动播放与弹幕，关闭面板销毁 iframe。嵌入播放由 B站控制，可能因登录、地区、版权或平台策略而失败；iframe load 不代表已验证视频可播放，因此始终提供原视频入口。简介模式显示原视频简介，**不是字幕、全文转录或外站文章全文阅读器**。

## 数据和隐私

真实封面直接从 B站图片域名读取，失败显示占位文字；不冒充封面已可用。收藏、访问记录、后续问题及收藏视频元数据保存在当前浏览器，无账号和云同步。第三方图片与播放器会向 B站发起访问。尚未迁移旧版本的非 B站内容收藏，它们保存在原存储项中。

## 当前验证边界

已验证公开元数据、原封面地址、服务端搜索、筛选规则和页面交互。B站搜索有间歇性 412 风控，不能承诺持续可用。GitHub Pages 没有服务端运行时，实时搜索由独立 Cloudflare Worker 提供。

## 待上线：实时瀑布流

开发分支将目录分页改为不等高瀑布流，滚动加载 B站搜索下一页，按 BV 号去重；搜索词、主题变化时取消旧请求。失败显示错误并暂停自动请求，不再把现有目录替换成实时搜索结果。空关键词发现页按最新发布排序。

搜索已迁移到现行 `/x/web-interface/wbi/search/type`；需要签名时获取动态 WBI 密钥与匿名访问会话。已在本机验证目录外关键词返回新视频，Cloudflare 出口仍被 B站 HTTP 412 拒绝，因此不能宣称线上搜索已修复。

用户已授权使用免费 Render 新加坡 Node 服务作为搜索后端。`render.yaml` 已准备，服务必须监听 `HOST=0.0.0.0`，健康检查为 `/api/health`。Render 连接目前返回 `Unknown tool`，尚未创建或部署服务。浏览器操作也被停止，未进行新版瀑布流的实际浏览器验收。

接通 Render 后，先验证其 `/api/search?q=量子纠缠&page=1` 返回 `mode: live` 和目录外的视频，再验证第 2 页返回新 BV 号。成功后把真实 Render 地址配置到 Cloudflare Worker 的 `SEARCH_ORIGIN`，必须为 HTTPS 的 `.onrender.com` 地址；随后发布 Worker 与 GitHub Pages。不要填入猜测地址，也不要在验证前把 412 标记为解决。

参考：[WBI 请求格式与参考测试向量](https://github.com/pskdje/bilibili-API-collect/blob/main/docs/misc/sign/wbi.md)。自动测试包含签名参考向量、上游分页、结果缓存、娱乐过滤、412 失败与匿名签名流程。
