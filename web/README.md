# UnBrainrot MVP

当前线上版本支持 B站原标题、原封面、站内嵌入播放、分集、简介阅读、规则筛选、收藏与搜索。前端仍为有限目录和搜索结果分页版；瀑布流界面在 PR #1，尚未合并。

## 实时搜索部署

GitHub Pages 前端调用现有 Cloudflare `/api/search`；Worker 的 `SEARCH_ORIGIN` 指向腾讯云 EdgeOne 的仅境外加速项目。B站实时请求实际由 EdgeOne Node.js 云函数发起。

已从 Cloudflare 入口实测“量子纠缠”：第一页 17 项，第二页另 17 项；34 项均不在原目录中。两个响应均为 HTTP 200、`mode: live`，并返回允许 GitHub 前端访问的 CORS 头。详情见 `../edgeone-api/deployment.json`。

此方案不要求前端购买域名，也不使用临时预览签名；EdgeOne 默认域名的中国大陆直连限制仍存在，所以浏览器通过 Cloudflare 入口访问。未来平台限制或额度变化可能影响可用性。

## 本地运行与测试

需要 Node.js 22 或更新版本。在 web 目录执行 `npm start`，访问 http://127.0.0.1:4173 。`npm test` 运行元数据、筛选、WBI 请求、Cloudflare 和 EdgeOne 云函数测试。

## 数据与播放边界

知识筛选基于标题和标签等规则，会漏筛或误筛，不执行事实核验。站内播放器由 B站官方提供，可能受登录、地区或视频权限限制。简介面板不是字幕转录或文章全文阅读器。

收藏、足迹和问题仅保存在当前浏览器。原封面与播放器会向 B站发送访问请求。YouTube 和图文来源尚未接入。
