# VibeVault - 可视化链接收藏夹

一个基于 Next.js 的可视化链接收藏夹，支持收藏链接、自动抓取元数据、标签管理、集合分组、搜索以及知识图谱可视化。

## 技术栈

- **Monorepo**: pnpm workspace
- **Web**: Next.js (App Router) + TypeScript
- **UI**: TailwindCSS + Framer Motion
- **数据层**: Prisma ORM
- **数据库**: SQLite (开发环境) / PostgreSQL (生产环境)
- **认证**: NextAuth (GitHub OAuth)

## 项目结构

```
VibeVault/
├── apps/
│   └── web/                # Next.js 应用
│       ├── src/
│       │   ├── actions/     # Server Actions
│       │   │   ├── exportActions.ts   # 导入导出功能
│       │   │   ├── linkActions.ts      # 链接相关操作
│       │   │   └── tagActions.ts       # 标签相关操作
│       │   ├── app/         # App Router 页面
│       │   │   ├── api/      # API 路由
│       │   │   ├── app/      # 应用主页面
│       │   │   │   ├── graph/       # 知识图谱页面
│       │   │   │   ├── link/        # 链接详情页
│       │   │   │   ├── settings/    # 设置页面
│       │   │   │   └── page.tsx     # 瀑布流列表页
│       │   │   ├── globals.css      # 全局样式
│       │   │   ├── layout.tsx        # 根布局
│       │   │   └── page.tsx          # 登录页面
│       │   ├── components/   # React 组件
│       │   │   ├── AppShell.tsx           # 应用外壳
│       │   │   ├── FilterBar.tsx          # 筛选栏
│       │   │   ├── LinkCard.tsx           # 链接卡片
│       │   │   ├── LinkGridMasonry.tsx    # 瀑布流布局
│       │   │   ├── Providers.tsx          # 提供者组件
│       │   │   └── Sidebar.tsx            # 侧边栏
│       │   └── lib/          # 工具库
│       │       └── auth.ts           # 认证配置
│       ├── .env              # 环境变量
│       └── .env.example       # 环境变量示例
├── packages/
│   └── db/                 # Prisma schema + client
│       ├── prisma/         # Prisma schema
│       └── src/            # 数据库工具函数
├── pnpm-workspace.yaml      # pnpm 工作区配置
└── README.md                # 项目说明
```

## 功能特性

### 收藏
- ✅ 输入 URL 保存为 Link
- ✅ 立即在列表中出现（optimistic UI）
- ✅ 支持手动编辑标题和备注
- ✅ 支持添加多个标签
- ✅ 支持在添加链接时直接选择标签

### 管理
- ✅ 标签增删改查
- ✅ 给链接打多个标签
- ✅ 列表筛选和排序
- ✅ 支持删除链接
- ✅ 支持收藏/取消收藏链接
- ✅ 支持归档链接

### 搜索
- ✅ 基础全文搜索

### 可视化
- ✅ 瀑布流卡片布局 (Masonry)
- ✅ 知识图谱可视化 (Graph)
- ✅ 视图切换选项卡
- ✅ 知识图谱支持点击链接直接打开

### 导入导出
- ✅ 导出 JSON 数据
- ✅ 导入 JSON 并自动去重
- ✅ 导入/导出状态反馈

### 认证
- ✅ 基于邮箱的简化登录（无需密码）
- ✅ 会话管理

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 初始化数据库

```bash
# 生成 Prisma Client
cd packages/db
pnpm generate

# 运行数据库迁移
pnpm push
```

### 运行开发服务器

```bash
cd apps/web
pnpm dev
```

应用将运行在 http://localhost:3000

### 环境变量

在 `apps/web` 目录下创建 `.env` 文件，并根据 `.env.example` 配置必要的环境变量：

```env
# NextAuth 配置
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# 数据库配置
DATABASE_URL="file:./dev.db"
```

### NPM 配置方式

如果使用 npm 替代 pnpm，可以按照以下步骤操作：

```bash
# 安装依赖
npm install

# 生成 Prisma Client
cd packages/db
npm run generate

# 运行数据库迁移
npm run push

# 运行开发服务器
cd ../apps/web
npm run dev
```

## 开发流程

### Milestone 1: 可运行骨架 ✅
- ✅ 初始化 Monorepo 结构
- ✅ 创建 packages/db
- ✅ 初始化 Next.js 项目
- ✅ 配置 TypeScript、TailwindCSS
- ✅ 定义 Prisma 数据库模型
- ✅ 配置 NextAuth
- ✅ 实现基础布局

### Milestone 2: 收藏与列表 ✅
- ✅ 实现 Server Actions
- ✅ 实现 LinkCard 组件
- ✅ 实现 LinkGridMasonry 组件
- ✅ 实现添加链接表单
- ✅ 实现删除链接功能
- ✅ 实现标签选择功能

### Milestone 3: 知识图谱 ✅
- ✅ 实现 GraphView 组件
- ✅ 实现图谱交互
- ✅ 实现图谱布局
- ✅ 优化曲线样式

### Milestone 4: 标签/筛选搜索 ✅
- ✅ 实现标签管理
- ✅ 实现列表筛选
- ✅ 实现列表排序

### Milestone 5: 导入导出 ✅
- ✅ 实现导出功能
- ✅ 实现导入功能

## 使用指南

### 收藏链接
1. 点击右上角的「添加链接」按钮
2. 在弹出的表单中输入 URL
3. 可选：输入标题、备注和选择标签
4. 点击「添加」按钮保存

### 管理链接
1. 在瀑布流列表中点击链接卡片查看详情
2. 点击编辑按钮修改链接信息
3. 点击删除按钮删除链接
4. 点击标签筛选链接

### 使用知识图谱
1. 点击顶部的「知识图谱」选项卡
2. 等待图谱加载完成
3. 点击链接节点可直接打开链接
4. 使用鼠标拖拽可平移视图
5. 使用鼠标滚轮可缩放视图

### 设置
1. 点击左侧栏的「设置」按钮
2. 可进行数据导入导出操作
3. 可管理标签（增删改查）

## 核心组件说明

### AppShell
应用的主外壳组件，包含：
- 顶部导航栏
- 侧边栏
- 主要内容区域
- 登录/登出按钮

### Sidebar
侧边栏组件，包含：
- 任务状态筛选
- 集合列表
- 标签云
- 添加标签表单

### FilterBar
筛选栏组件，包含：
- 搜索框
- 排序选项
- 视图切换
- 添加链接按钮

### LinkCard
链接卡片组件，包含：
- 链接标题和域名
- 描述和备注
- 标签展示
- 操作按钮（收藏、编辑、删除、归档）

### LinkGridMasonry
瀑布流布局组件，展示链接卡片

### GraphView
知识图谱组件，展示标签和链接的关系

## API 说明

### Server Actions

#### 链接相关
- `createLink`: 创建链接
- `listLinks`: 列出链接
- `updateLink`: 更新链接
- `deleteLink`: 删除链接
- `addTagToLink`: 给链接添加标签
- `removeTagFromLink`: 从链接移除标签

#### 标签相关
- `listTags`: 列出标签
- `createTag`: 创建标签
- `updateTag`: 更新标签
- `deleteTag`: 删除标签

#### 导入导出
- `exportData`: 导出数据
- `importData`: 导入数据

## 数据库模型

### User
- id: 主键
- name: 用户名
- email: 邮箱
- image: 头像 URL
- createdAt: 创建时间
- updatedAt: 更新时间

### Link
- id: 主键
- userId: 所属用户 ID
- url: 原始 URL
- normalizedUrl: 标准化 URL
- domain: 域名
- title: 标题
- description: 描述
- note: 备注
- ogImage: Open Graph 图片
- favicon: 网站图标
- siteName: 网站名称
- createdAt: 创建时间
- updatedAt: 更新时间
- lastVisitedAt: 最后访问时间
- status: 状态（INBOX, READING, ARCHIVED）
- favorite: 是否收藏
- metadataStatus: 元数据抓取状态
- metadataError: 元数据抓取错误

### Tag
- id: 主键
- userId: 所属用户 ID
- name: 标签名称
- color: 标签颜色
- createdAt: 创建时间

### LinkTag
- linkId: 链接 ID
- tagId: 标签 ID

## 部署说明

### Vercel
1. 连接 GitHub 仓库
2. 配置环境变量
3. 部署即可

### Docker
```bash
docker build -t vibevault .
docker run -p 3000:3000 vibevault
```

## 开发说明

### 代码风格
- 使用 TypeScript
- 使用 ESLint + Prettier 格式化代码
- 使用 TailwindCSS 进行样式开发
- 组件使用 PascalCase 命名
- 文件使用 kebab-case 命名

### 提交规范
- feat: 新功能
- fix: 修复 bug
- docs: 文档变更
- style: 代码风格调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，欢迎通过 GitHub Issues 反馈。