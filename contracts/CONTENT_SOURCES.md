# 内容来源调研与后备池（2026-10-30）

- YouTube Data API：官方频道uploads和playlistItems.list可按页枚举，需项目API Key。https://developers.google.com/youtube/v3/docs/playlistItems/list
- RSSHub：开源多站更新适配器，适合增量线索；自部署也不能保证源站允许访问。https://github.com/DIYgod/RSSHub
- yt-dlp：可导出频道/播放列表元数据，不必下载视频；flat-playlist可能缺简介。https://github.com/yt-dlp/yt-dlp
- UApiPro：实际取得公开B站投稿分页与详情数据，访客免费额度有限；实采发现分页数量与账号总数不一致，不作为已抓全的证明。https://uapis.cn/docs/api-reference/get-social-bilibili-archives
- Nemo2011/bilibili-api 已于2026-07-06归档并停止维护，未引入为依赖。https://github.com/Nemo2011/bilibili-api

## 本次采集

- 大圆镜科普（UID 1208823126）：抓到 154 个投稿标识；账号接口报告 239；完整性未通过。
- 毕导（UID 254463269）：抓到 112 个投稿标识；账号接口报告 176；完整性未通过。
- 毕的二阶导（UID 489763089）：抓到 168 个投稿标识；账号接口报告 170；完整性未通过。
- 罗翔说刑法（UID 517327498）：抓到 150 个投稿标识；账号接口报告 506；完整性未通过。
- 3Blue1Brown（UID 88461692）：抓到 90 个投稿标识；账号接口报告 150；完整性未通过。
- 大问题Dialectic（UID 1871365234）：抓到 58 个投稿标识；账号接口报告 111；完整性未通过。
- 漫士沉思录（UID 266765166）：抓到 59 个投稿标识；账号接口报告 154；完整性未通过。
- 吟游诗人基德（UID 510856133）：抓到 27 个投稿标识；账号接口报告 275；完整性未通过。

最终去重的公开免费候选 816 条。候选不是已通过筛选内容；详情、作者认证与当前规则仍可能排除条目。没有宣称收齐八个账号的全部视频。

## 维护命令

`node scripts/collect-reserve.mjs`：重新采集指定名单，逐页保存，只有分页总数、唯一ID数和账号总数一致才complete=true。请求失败或提前空页保留partial状态；不请求私有或付费视频。目录需部署到腾讯云后端才能更新线上池。

`node scripts/import-reserve.mjs --file=metadata.json --mid=账号UID --name=作者 --series=已批准科普系列名`：导入yt-dlp的JSON元数据，保留源视频链接；系列只作为单集身份例外，不覆盖政治、广告、教学或伪科学排除。导入不等于完整性通过。

当前后备池持久保存在仓库，在线请求按种子抽6个候选，补齐简介并核对实际视频作者，再交给当前筛选方式。没有部署定时采集任务，没有实时YouTube Key，不声称已接入所有调研项目。图文依旧走公开HTML，不改回网站RSS/API。

## 新增媒体映射

- https://www.quantamagazine.org/
- https://theamericanscholar.org/
- https://www.thedial.world/
- https://www.theguardian.com/science
- https://longreads.com/
- https://www.noemamag.com/
- https://aeon.co/
- https://www.promarket.org/
- https://worksinprogress.co/（用户已确认）
- YouTube：3Blue1Brown原作者频道，公开频道资料和Atom更新。

添加适配不等于所有文章始终可读取。The American Scholar等站存在订阅内容，仅展示通过公开正文与内容墙检查的页面；访问失败/禁止采集的来源跳过。YouTube嵌入可能受地区或视频自身限制，保留原视频链接。
