# EdgeOne 搜索 API

使用腾讯云中国站账号，Node.js 云函数运行搜索代码。`cloud-functions/api/search.js` 处理实时分页搜索，`health.js` 提供健康检查。

## 部署方式

官方 MCP 已通过 `codex mcp add edgeone-pages -- npx -y edgeone-pages-mcp-fullstack@0.0.41 --region china` 配置。首次部署需在官方网页完成登录。MCP 可部署此目录，项目名使用 `unbrainrot-search-api-public`。

为了使用不带三小时签名的默认域名，已另建 `overseas` 加速区域项目。官方 CLI 命令：

```powershell
edgeone makers deploy -n unbrainrot-search-api-public -a overseas --json
```

这与账号的中国站/国际站选择是两个独立设置。仅境外加速项目的默认域名允许境外直接访问，中国大陆直接访问可能返回 401；现有 GitHub 网页通过 Cloudflare Worker 调用，不直接请求该域名。首次含中国大陆的临时预览项目保留用于验证，未用于正式前端调用。

## 搜索链路

GitHub Pages → Cloudflare `/api/search` → EdgeOne Node.js `/api/search` → B站公开搜索。

实时结果按页请求，仍可能受 B站后续策略变化或平台额度影响。不会把现有目录伪装成实时搜索成功。源站地址与非敏感部署记录见 `deployment.json`。临时访问签名、登录凭据、`.env`、`.edgeone/` 不提交到仓库。

## 验证

本次含中国大陆的预览部署：健康检查 200；“量子纠缠”第一页 17 项；第二页另 17 项，均为实时数据。仅境外默认域名也已不带签名返回实时结果。Cloudflare 端到端验证结果在部署记录中单独记录，不由直连结果推断。

官方参考：[默认域名的地域与预览限制](https://edgeone.ai/document/175201428435140608)、[Node.js 云函数](https://pages.edgeone.ai/document/node-functions)。

## AI workflow

可选筛选接口及环境变量配置见 [WORKFLOW.md](./WORKFLOW.md)。未配置时保留默认规则。
