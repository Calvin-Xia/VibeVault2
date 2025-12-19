# VibeVault 可视化链接收藏夹实现计划

## 项目架构
- **Monorepo**：使用 pnpm workspace
- **Web 应用**：Next.js (App Router) + TypeScript
- **UI 框架**：TailwindCSS + shadcn/ui + Framer Motion
- **数据层**：Prisma ORM
- **数据库**：PostgreSQL (开发环境可用 SQLite 作为 fallback)
- **认证**：NextAuth (GitHub OAuth)
- **后台任务**：BullMQ + Redis (或简化版 DB 轮询 + cron)

## 实现步骤

### Milestone 1：可运行骨架
1. **初始化 Monorepo 结构**
   - 创建 pnpm workspace 配置
   - 创建 apps/ 和 packages/ 目录
   - 初始化 packages/db (Prisma schema + client)

2. **创建 Next.js 应用**
   - 在 apps/web 目录初始化 Next.js 项目
   - 配置 TypeScript、TailwindCSS、shadcn/ui

3. **配置 Prisma ORM**
   - 定义数据库模型 (User, Link, Tag, Collection, Job 等)
   - 配置数据库连接
   - 生成 Prisma client

4. **配置 NextAuth**
   - 实现 GitHub OAuth 认证
   - 配置 session 管理

5. **实现基础布局**
   - AppShell (sidebar + header + main)
   - Sidebar 组件
   - FilterBar 组件
   - 路由配置

### Milestone 2：收藏与列表
1. **实现 Server Actions**
   - createLink：创建链接并返回乐观更新
   - listLinks：分页获取链接列表
   - toggleFavorite：切换链接星标状态

2. **实现 UI 组件**
   - LinkCard：链接卡片组件
   - LinkGridMasonry：瀑布流布局
   - 骨架屏加载组件
   - 分页加载逻辑

3. **实现乐观 UI**
   - 链接创建后立即显示在列表中
   - 使用 TanStack Query 管理数据

### Milestone 3：Worker 抓取元数据
1. **创建 BullMQ Worker**
   - 在 apps/worker 目录初始化 worker 项目
   - 配置 BullMQ 队列

2. **实现元数据抓取逻辑**
   - 使用 undici/fetch 发起 HTTP 请求
   - 使用 cheerio 解析 HTML
   - 提取 og:title, og:description, og:image 等元数据
   - 处理重定向和超时

3. **配置任务处理**
   - 创建 FETCH_METADATA 任务
   - 实现任务重试机制
   - 更新 Link 表的 metadata 状态

4. **前端刷新机制**
   - 使用 TanStack Query 轮询更新 metadata
   - 实现 metadata 加载失败的状态处理

### Milestone 4：标签/集合/筛选搜索
1. **标签管理**
   - 实现 Tag CRUD Server Actions
   - 实现 TagPicker 组件 (多选 + 创建新标签)
   - 实现标签筛选功能

2. **集合管理**
   - 实现 Collection CRUD Server Actions
   - 实现 CollectionPicker 组件
   - 实现集合筛选功能

3. **筛选与排序**
   - 实现按状态、星标筛选
   - 实现多种排序方式 (最新收藏/最近访问/域名/标题)

4. **搜索功能**
   - 实现基础全文搜索
   - 实现 Cmd/Ctrl + K 快捷键打开 Command Palette

### Milestone 5：知识图谱视图
1. **实现 GraphView 组件**
   - 选择并集成图可视化库 (reactflow)
   - 实现 TagNode 和 LinkNode 组件
   - 实现边的渲染

2. **图谱交互**
   - 实现节点点击事件
   - 打开链接详情抽屉
   - 实现图谱筛选功能

3. **图谱布局**
   - 实现标签节点与链接节点的连接
   - 优化图谱布局算法

### Milestone 6：导入导出
1. **导出功能**
   - 实现导出 JSON 格式数据
   - 包含用户全部链接、标签、集合

2. **导入功能**
   - 实现导入 JSON 数据
   - 自动去重逻辑
   - 导入结果反馈

## 技术要点
- 所有写操作必须做权限校验
- 实现分页/虚拟滚动优化性能
- 确保可访问性（aria-label、键盘操作）
- 实现玻璃态设计 + 微妙渐变 + 适度动效
- 使用 Framer Motion 实现平滑动画

## 交付内容
- 完整可运行代码
- README：本地启动指南（含 docker compose 配置）
- .env.example 配置文件
- Prisma migrations

现在开始按照计划实现项目。