# TVBox Source Aggregator

将多个 TVBox 配置源合并成一个稳定的聚合地址。自动测速筛选、站点级去重、Spider JAR 智能分配。

支持三种部署方式：**Cloudflare Worker**（免费）、**Docker**（一行命令）、**本地运行**（一键脚本）。

## 功能

- **多源聚合** — 添加多个 TVBox 配置 JSON 地址，自动合并为一个
- **站点去重** — 不同源中的相同站点只保留一份
- **Spider JAR 智能分配** — 自动处理 type:3 站点的 JAR 依赖冲突
- **测速筛选**（可选） — 自动过滤不可达或高延迟的源
- **管理后台** — 网页端添加/删除源，触发刷新
- **定时更新** — 每天自动重新聚合，客户端无感知
- **容错设计** — 聚合失败时保留上次有效缓存
- **直播频道级合并** — 自动下载/解析/去重 m3u,按组/频道输出
- **多端点兼容** — JSON Native / DIYP TXT / **M3U 播放列表** 三种格式并行,适配所有 TVBox fork

---

## 部署方式一：Docker（推荐）

最简单的部署方式，适合有服务器/NAS 的用户。

### 1. 克隆仓库

```bash
git clone https://gitee.com/tengxiaobao/tvbox-source-aggregator.git
cd tvbox-source-aggregator
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少修改 `ADMIN_TOKEN`：

```
ADMIN_TOKEN=你的管理密码
PORT=5678
```

### 3. 启动

```bash
docker compose up -d
```

完成！访问 `http://你的IP:5678/admin` 管理源。

### 常用命令

```bash
docker compose logs -f      # 查看日志
docker compose restart      # 重启
docker compose down         # 停止
docker compose up -d --build  # 重新构建并启动
```

---

## 部署方式二：一键脚本

适合没有 Docker 但有 Node.js 环境的用户（需要 Node.js 18+）。

### 1. 克隆仓库

```bash
git clone https://gitee.com/tengxiaobao/tvbox-source-aggregator.git
cd tvbox-source-aggregator
```

### 2. 一键启动

**Mac 用户**：双击项目目录中的 `start.command` 文件

**Windows 用户**：双击项目目录中的 `start.bat` 文件

**命令行用户**：
```bash
node scripts/start.js
```

首次启动会自动完成：
- 检查 Node.js 版本
- 安装依赖
- 创建数据目录
- 引导配置 `.env`（提示设置管理密码）
- 检查端口是否可用
- 编译并启动服务

### 后台运行

```bash
# 使用 pm2
npm install -g pm2
pm2 start scripts/start.js --name tvbox

# 或使用 nohup
nohup node scripts/start.js > tvbox.log 2>&1 &
```

---

## 部署方式三：Cloudflare Worker

免费，不需要自己的服务器。适合有 Cloudflare 账号的用户。

### 1. 准备环境

- [Cloudflare 账号](https://dash.cloudflare.com/sign-up)（免费）
- Node.js 18+

### 2. 克隆仓库

```bash
git clone https://gitee.com/tengxiaobao/tvbox-source-aggregator.git
cd tvbox-source-aggregator
npm install
```

### 3. 登录 Cloudflare

```bash
npx wrangler login
```

### 4. 创建 KV 存储

```bash
npx wrangler kv namespace create KV
npx wrangler kv namespace create KV --preview
```

将输出的 `id` 和 `preview_id` 填入 `wrangler.toml`。

### 5. 设置密码

```bash
echo "your-admin-password" | npx wrangler secret put ADMIN_TOKEN
```

### 6. 部署

```bash
npm run deploy
```

### 7. 自定义域名（推荐）

Workers 默认的 `*.workers.dev` 域名在部分网络环境下不可直接访问。如果你有托管在 Cloudflare 的域名：

1. 在 Cloudflare DNS 添加记录：`AAAA tvbox 100::` （已代理）
2. 取消 `wrangler.toml` 中 `routes` 的注释，填入你的域名和 Zone ID

---

## 使用

### 添加源

打开管理后台 `http://你的地址/admin`，输入密码登录：

- **添加源**：输入 TVBox 配置 JSON URL，点击 Add
- **删除源**：点击源旁边的 Remove
- **刷新**：点击 Refresh 触发一次聚合

### TVBox 配置

将你的聚合地址填入 TVBox 的接口地址：

```
http://你的地址:5678/
```

主配置 `/` 自带 hybrid 直播:
- `[0]` 是 `type: 0` 的 URL 指针 → 自动从 `/live.m3u` 下载
- `[1..]` 是 Native inline 分组(老 fork 直接渲染)

如果你的 TVBox fork 在主配置里看不到直播,把 `/live.m3u` 单独加到「自定义直播源」即可。

### 端点说明

| 端点 | 方法 | Content-Type | 说明 |
|------|------|--------------|------|
| `/` | GET | application/json | **TVBox 主配置**(含站点 + 解析 + hybrid 直播) |
| `/live.m3u` | GET | audio/x-mpegurl | **标准 M3U 播放列表**,所有 TVBox fork 通吃 |
| `/live.json` | GET | application/json | 仅直播 JSON(Native) |
| `/live-config` | GET | text/plain | 仅直播 TXT(DIYP, `#genre#` 格式) |
| `/index.json` | GET | application/json | 同 `/`,带 `attachment` 下载头 |
| `/status` | GET | text/html | 监控仪表盘页面 |
| `/status-data` | GET | application/json | 状态数据 JSON |
| `/admin` | GET | text/html | 管理后台(密码保护) |
| `/admin/sources` | GET/POST/DELETE | application/json | 源管理 API(密码保护) |
| `/admin/lives` | GET/POST/DELETE | application/json | 直播源管理 API(密码保护) |
| `/refresh` | POST | application/json | 手动触发聚合刷新(Bearer token) |

---

## 可选：测速功能

注册 [zbape.com](https://www.zbape.com) 获取免费 API Key。

**Docker / 本地**：在 `.env` 中设置：
```
ZBAPE_API_KEY=your-api-key
```

**Cloudflare Worker**：
```bash
echo "your-api-key" | npx wrangler secret put ZBAPE_API_KEY
```

开启后，每次聚合会自动测速并过滤高延迟源。

---

## 项目结构

```
├── src/
│   ├── core/              # 业务逻辑
│   │   ├── fetcher.ts     # 批量 fetch 配置 JSON
│   │   ├── parser.ts      # 配置规范化
│   │   ├── merger.ts      # 站点级合并引擎
│   │   ├── dedup.ts       # 去重逻辑
│   │   ├── speedtest.ts   # zbape.com 测速 API
│   │   ├── admin.ts       # 管理后台页面
│   │   ├── dashboard.ts   # 监控仪表盘页面
│   │   ├── types.ts       # TypeScript 类型
│   │   └── config.ts      # 配置常量
│   ├── storage/           # 存储抽象层
│   │   ├── interface.ts   # Storage 接口
│   │   ├── kv.ts          # Cloudflare KV 适配
│   │   ├── sqlite.ts      # SQLite 实现
│   │   └── json-file.ts   # JSON 文件降级
│   ├── routes.ts          # HTTP 路由（Hono）
│   ├── aggregator.ts      # 聚合流程编排
│   ├── cf-entry.ts        # Cloudflare Worker 入口
│   └── node-entry.ts      # Node.js 入口
├── scripts/
│   ├── start.js           # 一键启动脚本
│   └── build.js           # Node.js 构建脚本
├── Dockerfile
├── docker-compose.yml
├── .env.example           # 环境变量模板
├── wrangler.toml          # CF Worker 配置
└── package.json
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_TOKEN` | 管理后台密码（必填） | - |
| `PORT` | 服务端口（Docker/本地） | `5678` |
| `BASE_URL` | 外部访问地址,Docker 必填,供 JAR/图片代理改写 | `http://localhost:5678` |
| `CRON_SCHEDULE` | 定时聚合 Cron（UTC） | `0 5 * * *` |
| `ZBAPE_API_KEY` | zbape.com 测速 API 密钥 | - |
| `REFRESH_TOKEN` | 刷新接口独立 Token(留空 = 用 ADMIN_TOKEN) | - |
| `SPEED_TIMEOUT_MS` | 源延迟阈值(测速筛选) | `5000` |
| `SITE_TIMEOUT_MS` | 站点 API 测速超时 | `3000` |
| `FETCH_TIMEOUT_MS` | fetch 配置超时(**代理链路建议 10000~15000**) | `10000` |
| `SCRAPE_SOURCE_URL` | 自动抓取源列表 URL(萌芽插件) | - |
| `MACCMS_API_URL` / `MACCMS_AES_KEY` / `MACCMS_AES_IV` | MacCMS 资源站配置(三个都要填才启用) | - |
| `DATA_DIR` | 数据存储目录（Docker/本地） | `./data` |

> 想要走代理(SOCKS5/HTTP)抓 GitHub 源的:`SOCKS_PROXY=socks5://host:port` 或 `HTTP_PROXY=http://host:port` 在 `.env` 设置; 当前版本(2.1.2) 的 fetcher 直连优先,如需 SOCKS 集成需手写 undici Dispatcher,参见 `docs/2026-10-11-LAN部署与TVBox直播兼容.md`。

---

## 局域网（Docker / NAS）部署进阶

适合自家 NAS、Linux 服务器跑,局域网内多设备共享。完整实战见:[`docs/2026-10-11-LAN部署与TVBox直播兼容.md`](docs/2026-10-11-LAN部署与TVBox直播兼容.md),主要差异点:

- **网络受限**(墙内/局域网): 源用 jsDelivr CDN,不要用 `raw.githubusercontent.com` 或 `gh-proxy.com`
- **TVBox fork 老**: 主配置填 `http://LAN-IP:5678/` 不显示直播,把 `/live.m3u` 单独加为「自定义直播源」
- **`BASE_URL` 必填**: Docker 容器拿不到宿主机 IP,必须设 `BASE_URL=http://192.168.x.x:5678` 才能正确处理 JAR/图片代理路径
- **fetch 超时**: `FETCH_TIMEOUT_MS=10000` 起,代理链路给 15000

---

## License

MIT
