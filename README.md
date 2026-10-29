# UnBrainrot

黑绿主题的知识内容探索 MVP。[打开网页](https://observl.github.io/UnBrainrot/)

实时搜索链路现已接通：GitHub Pages → Cloudflare Worker → 腾讯云 EdgeOne Node.js 云函数 → B站。

实测“量子纠缠”两页各返回 17 个实时结果，共 34 个不同视频，全部不在原目录中。使用 EdgeOne 仅境外加速的默认域名供 Cloudflare 调用，前端无需改域名，也不依赖三小时预览签名。平台策略变化仍可能影响后续可用性。

[API 部署与验证记录](edgeone-api/README.md) · [非敏感部署信息](edgeone-api/deployment.json)

当前前端保持已发布版本。瀑布流改动仍在 PR #1，新增 YouTube 与图文来源尚未接入。

本地运行：在 web 目录执行 `npm start`；验证：`npm test`。
