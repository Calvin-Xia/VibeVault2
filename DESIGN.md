# DESIGN.md — VibeVault「暗夜宝库」

> 深夜书房里的一座数据宝库:你收藏的每一个链接,都是一枚在黑暗中微微发光的藏品。

## 1. Visual Theme & Atmosphere

**Style**: 暗夜宝库 Dark Vault(暗黑科技改造 · 克制版)
**Keywords**: 深蓝黑 · 玻璃卡片 · 紫青渐变 · 克制留白 · 数据星空 · 玻璃拟态 · 沉浸 · 温度
**Tone**: 安静、深邃、有质感 — **NOT** 赛博朋克刺眼霓虹、NOT 炫技、NOT 花哨
**Feel**: 像深夜书房里的一整面玻璃展柜,每个链接藏品在暗处泛着微光,你的收藏本身就是主角。

**Interaction Tier**: **L2 流畅交互**(滚动 reveal + SpotlightCard + 氛围层呼吸 + 图谱节点弹性入场)
**Dependencies**: 无新增运行时依赖 — framer-motion(已有)、IntersectionObserver、CSS Variables + keyframes;不引入 GSAP/Lenis/WebGL。

**设计原则(本项目独有)**:
- **内容即主角**:卡片里的 og:image / favicon / 截图是天然的彩色,背景必须深且净,强调色只出现在**交互元素**(按钮、链接、选中态、节点高亮),同屏强调色 ≤ 2 处。
- **暗色为品牌默认**,亮色为「白昼宝库」变体(同一套 accent,冷白底),通过 `<html class="dark">` 切换(现状结构不变,仅换数值)。

## 2. Color Palette & Roles

沿用项目 `globals.css` 的 shadcn HSL 三元组结构(全项目 Tailwind 通过 `hsl(var(--x))` 消费),**只替换数值 + 新增语义变量**。下方为可直接粘贴的 token 块:

```css
/* ============ 暗夜主题(默认) <html class="dark"> ============ */
.dark {
  /* shadcn 兼容层(名称不变,值全部重定) */
  --background: 228 30% 5%;          /* #080A12 深蓝黑 */
  --foreground: 220 40% 96%;         /* #F2F4FA */
  --card: 228 26% 8%;                /* #0E1018 玻璃卡片 */
  --card-foreground: 220 40% 96%;
  --popover: 228 28% 7%;
  --popover-foreground: 220 40% 94%;
  --primary: 258 84% 60%;            /* #7C3AED 紫罗兰(CTA/链接/选中) */
  --primary-foreground: 224 60% 98%;
  --secondary: 227 22% 13%;          /* #1A1D29 */
  --secondary-foreground: 220 30% 88%;
  --muted: 227 22% 12%;
  --muted-foreground: 225 14% 62%;   /* #95A0B5 */
  --accent: 258 50% 18%;             /* 带紫调的次级表面 */
  --accent-foreground: 220 40% 96%;
  --destructive: 0 72% 61%;          /* #E4555C 错误/删除 */
  --destructive-foreground: 220 40% 98%;
  --border: 227 20% 15%;             /* #1F2230 */
  --input: 227 20% 15%;
  --ring: 258 84% 60%;
  --radius: 0.75rem;

  /* 新增语义层 */
  --surface-alt: 228 24% 11%;        /* 交替表面/输入框底 */
  --surface-hover: 228 22% 15%;
  --border-hover: 226 22% 26%;       /* #3A3F52 */
  --violet: 258 84% 60%;             /* 渐变主元 */
  --cyan: 187 86% 51%;               /* #22D3EE 渐变辅元 */
  --text-tertiary: 225 14% 46%;
  --success: 158 64% 45%;            /* #29BC5F */
  --warning: 43 96% 56%;             /* #FBBF24 */

  /* RGB 辅助值(rgba() 用) */
  --violet-rgb: 124 58 237;
  --cyan-rgb: 34 211 238;
  --bg-rgb: 8 10 18;
  --success-rgb: 41 188 95;
  --warning-rgb: 251 191 36;
  --destructive-rgb: 228 85 92;
}

/* ============ 白昼主题 <html>(亮色变体,同一 accent) ============ */
:root {
  --background: 222 40% 97%;         /* #F3F5FB 冷白 */
  --foreground: 230 30% 10%;         /* #12141C */
  --card: 0 0% 100%;
  --card-foreground: 230 30% 10%;
  --popover: 0 0% 100%;
  --popover-foreground: 230 30% 10%;
  --primary: 258 84% 56%;            /* #7C3AED */
  --primary-foreground: 0 0% 100%;
  --secondary: 222 30% 93%;
  --secondary-foreground: 230 25% 20%;
  --muted: 222 30% 93%;
  --muted-foreground: 228 14% 44%;   /* #5E6578 */
  --accent: 258 70% 94%;             /* 淡紫表面 */
  --accent-foreground: 230 30% 14%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 222 24% 88%;
  --input: 222 24% 86%;
  --ring: 258 84% 56%;
  --radius: 0.75rem;

  --surface-alt: 222 34% 95%;
  --surface-hover: 222 30% 90%;
  --border-hover: 226 18% 72%;
  --violet: 258 84% 56%;
  --cyan: 187 86% 45%;               /* 亮色下 cyan 需压深保对比 */
  --text-tertiary: 228 14% 56%;
  --success: 158 64% 40%;
  --warning: 43 96% 50%;
  --violet-rgb: 124 58 237;
  --cyan-rgb: 8 145 178;
  --bg-rgb: 243 245 251;
  --success-rgb: 22 163 74;
  --warning-rgb: 217 119 6;
  --destructive-rgb: 220 38 38;
}

/* 品牌渐变(全局唯一标准) */
.gradient-accent {
  background-image: linear-gradient(135deg, hsl(var(--violet)), hsl(var(--cyan)));
}
```

**Color Rules:**
- 所有颜色一律经 CSS 变量引用,组件内 **零硬编码 hex**;需要透明度时用 RGB 辅助值 `rgba(var(--violet-rgb), 0.35)` 或 HSL 斜杠语法 `hsl(var(--violet) / 0.35)`。
- 渐变只属于:主 CTA、Hero 标题、活跃导航项、选中图谱节点——同一屏渐变强调 ≤ 2 处。
- 卡片内容区的彩色(og:image、favicon、用户自定义标签色)不在规范管辖内,但**不得在它们之上再加彩色叠加**。
- 亮色/暗色共用同一 accent 基因(紫→青),仅亮度与饱和度不同,保证品牌一致性。
- 语义色(success/warning/destructive)只在状态场景出现,不许当装饰色。

## 3. Typography Rules

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
```

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero H1(登录页) | Space Grotesk + Noto Sans SC | clamp(2.25rem, 6vw, 3.5rem) | 700 | 1.15 | -0.02em |
| Section H2(页面标题) | Noto Sans SC | 1.5rem | 700 | 1.3 | -0.01em |
| H3(卡片标题) | Noto Sans SC | 1rem | 600 | 1.4 | 0 |
| Body | Noto Sans SC | 0.9375rem (15px) | 400 / 500 | 1.7 | 0.02em |
| Label / Eyebrow | Space Grotesk | 0.6875rem (11px) | 600 | 1.4 | 0.12em |
| Mono(URL/域名/数字) | JetBrains Mono | 0.8125rem (13px) | 400–500 | 1.6 | 0 |
| Small(辅助/时间戳) | Noto Sans SC | 0.8125rem (13px) | 400 | 1.6 | 0.01em |

```css
body { font-family: 'Noto Sans SC', 'Space Grotesk', system-ui, -apple-system, sans-serif; }
.font-display { font-family: 'Space Grotesk', 'Noto Sans SC', system-ui, sans-serif; }
.font-mono-domain { font-family: 'JetBrains Mono', ui-monospace, monospace; }
```

**Typography Rules:**
- 中文字族在前、拉丁字族作 fallback 的混排栈;拉丁字符/数字自动落到 Space Grotesk(科技感的数字),CJK 落到 Noto Sans SC。
- 正文字号 ≥ 15px,行高 ≥ 1.7,字距 0.02em(中文规范)。
- 标题 weight ≥ 600,正文 400,强调正文 500。
- **NEVER use**: 手写体/书法体(Caveat、LXGW WenKai 等——与本项目科技基调冲突)、系统默认 serif、Pixel 字体。

**Text Decoration**(按暗黑科技 + 克制规则判定):
- **Hero H1(登录页)**:渐变文字,仅品牌词「VibeVault」应用 `linear-gradient(135deg, hsl(var(--violet)), hsl(var(--cyan)))` + `background-clip: text`;**不加 text-shadow**(字号 < 80px,按规则省略 glow)。
- **Section H2 及以下**:无渐变、无投影(克制原则)。
- **Eyebrow 小标签**:左边 2px 紫色短线 `border-left: 2px solid hsl(var(--violet))`,不用投影。
- **正文段落 p**:任何装饰一律禁止。

## 4. Component Stylings

### Buttons(含全部状态)

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  height: 2.5rem; padding: 0 1rem; border-radius: .625rem;
  font-family: 'Noto Sans SC', sans-serif; font-size: .875rem; font-weight: 500;
  letter-spacing: .02em; border: 1px solid transparent; cursor: pointer;
  user-select: none; white-space: nowrap;
  transition: transform .18s cubic-bezier(.4,0,.2,1), box-shadow .18s ease,
              background-color .18s ease, border-color .18s ease, color .18s ease, opacity .18s ease;
}
.btn:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
.btn:disabled, .btn[data-disabled] { opacity: .45; cursor: not-allowed; transform: none !important; box-shadow: none !important; }

/* 主 CTA — 紫青渐变(唯一渐变按钮) */
.btn-primary {
  background-image: linear-gradient(135deg, hsl(var(--violet)), hsl(var(--cyan)));
  color: hsl(var(--primary-foreground));
  box-shadow: 0 4px 18px -6px rgba(var(--violet-rgb), .55);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 26px -6px rgba(var(--violet-rgb), .7);
}
.btn-primary:active:not(:disabled) { transform: translateY(0) scale(.97); box-shadow: 0 2px 10px -4px rgba(var(--violet-rgb), .5); }

/* 次级(兼容现有 shadcn `bg-primary`:纯紫,非渐变) */
.btn-secondary { background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground)); border-color: hsl(var(--border)); }
.btn-secondary:hover:not(:disabled) { background: hsl(var(--surface-hover)); border-color: hsl(var(--border-hover)); }
.btn-secondary:active:not(:disabled) { transform: scale(.97); }

/* 幽灵/图标按钮 */
.btn-ghost { background: transparent; color: hsl(var(--secondary-foreground)); }
.btn-ghost:hover:not(:disabled) { background: hsl(var(--secondary) / .6); color: hsl(var(--foreground)); }
.btn-ghost:active:not(:disabled) { background: hsl(var(--secondary)); }

/* 危险操作 */
.btn-destructive { background: hsl(var(--destructive)); color: hsl(var(--destructive-foreground)); }
.btn-destructive:hover:not(:disabled) { filter: brightness(1.08); box-shadow: 0 4px 16px -6px rgba(var(--destructive-rgb), .5); }
.btn-destructive:active:not(:disabled) { transform: scale(.97); }
```

### Cards(LinkCard / 详情卡,含 default / hover / focus-within)

```css
.card {
  position: relative; overflow: hidden;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  transition: transform .25s cubic-bezier(.16,1,.3,1), border-color .25s ease, box-shadow .25s ease;
}
/* Spotlight:鼠标聚光灯(径向渐变,非 blur,rAF 节流由 JS 驱动 --mx/--my) */
.card::before {
  content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0;
  transition: opacity .3s ease;
  background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%),
              rgba(var(--violet-rgb), .13), transparent 65%);
}
.card:hover {
  transform: translateY(-3px);
  border-color: hsl(var(--border-hover));
  box-shadow: 0 12px 32px -12px rgba(0,0,0,.6),
              0 0 24px -6px rgba(var(--violet-rgb), .25);
}
.card:hover::before { opacity: 1; }
.card:focus-within {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / .35), 0 8px 24px -12px rgba(0,0,0,.55);
}

/* 卡片封面图 */
.card-cover { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; }
.card-cover-wrap { overflow: hidden; }
.card:hover .card-cover { transform: scale(1.045); }
.card-cover-wrap .card-cover { transition: transform .5s cubic-bezier(.16,1,.3,1); }
```

### Navigation(顶栏 + 侧边栏,含 scrolled / active)

```css
/* 顶栏:透明 → 滚动后毛玻璃 */
.topbar {
  position: sticky; top: 0; z-index: 40;
  background: transparent; border-bottom: 1px solid transparent;
  backdrop-filter: none;
  transition: background-color .3s ease, border-color .3s ease, backdrop-filter .3s ease;
}
.topbar.scrolled, .topbar.is-scrolled {
  background: hsl(var(--background) / .82);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom-color: hsl(var(--border));
}

/* 侧边栏导航项 */
.nav-item {
  display: flex; align-items: center; gap: .625rem;
  padding: .5rem .75rem; border-radius: .5rem;
  color: hsl(var(--muted-foreground)); font-size: .875rem; font-weight: 500;
  border: 1px solid transparent;
  transition: background-color .15s ease, color .15s ease, border-color .15s ease;
}
.nav-item:hover { background: hsl(var(--secondary) / .7); color: hsl(var(--foreground)); }
.nav-item:active { background: hsl(var(--secondary)); }
.nav-item:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: -2px; }
.nav-item[data-active="true"], .nav-item.router-link-active {
  color: hsl(var(--foreground)); font-weight: 600;
  background: linear-gradient(90deg, hsl(var(--accent)), transparent);
  box-shadow: inset 2px 0 0 hsl(var(--violet));
}

/* 顶栏活动 Tab */
.tab-item { position: relative; padding: .375rem .875rem; color: hsl(var(--muted-foreground)); border-radius: .5rem; transition: color .15s ease, background-color .15s ease; }
.tab-item:hover { color: hsl(var(--foreground)); background: hsl(var(--secondary) / .6); }
.tab-item:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
.tab-item[data-active="true"] { color: hsl(var(--foreground)); }
.tab-item[data-active="true"]::after {
  content: ''; position: absolute; left: .875rem; right: .875rem; bottom: -1px;
  height: 2px; border-radius: 2px;
  background-image: linear-gradient(90deg, hsl(var(--violet)), hsl(var(--cyan)));
}
```

### Links

```css
.link {
  color: hsl(var(--violet)); text-decoration: none;
  transition: color .2s ease;
}
.link:hover { color: hsl(var(--cyan)); text-decoration: underline; text-underline-offset: 4px; text-decoration-thickness: 1.5px; }
.link:active { color: hsl(var(--violet)); }
.link:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; border-radius: 2px; }
```

### Tags / Badges / Chips

```css
.chip {
  display: inline-flex; align-items: center; gap: .375rem;
  height: 1.5rem; padding: 0 .625rem; border-radius: 9999px;
  font-size: .75rem; font-weight: 500; letter-spacing: .01em;
  background: hsl(var(--secondary)); color: hsl(var(--secondary-foreground));
  border: 1px solid hsl(var(--border));
  transition: border-color .15s ease, background-color .15s ease, color .15s ease, transform .15s ease;
}
.chip:hover { border-color: hsl(var(--border-hover)); transform: translateY(-1px); }
.chip:active { transform: translateY(0) scale(.96); }
.chip:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
.chip[data-active="true"], .chip.is-active {
  background: hsl(var(--violet) / .16); color: hsl(var(--violet));
  border-color: hsl(var(--violet) / .45); font-weight: 600;
}

/* 状态徽章 */
.badge { display: inline-flex; align-items: center; gap: .375rem; height: 1.25rem; padding: 0 .5rem; border-radius: 9999px; font-size: .6875rem; font-weight: 600; letter-spacing: .06em; }
.badge--success { color: hsl(var(--success)); background: hsl(var(--success) / .14); border: 1px solid hsl(var(--success) / .35); }
.badge--warning { color: hsl(var(--warning)); background: hsl(var(--warning) / .14); border: 1px solid hsl(var(--warning) / .35); }
.badge--error   { color: hsl(var(--destructive)); background: hsl(var(--destructive) / .14); border: 1px solid hsl(var(--destructive) / .35); }
.badge--pending { color: hsl(var(--muted-foreground)); background: hsl(var(--secondary)); border: 1px solid hsl(var(--border)); }
```

### Inputs / Search

```css
.input {
  height: 2.5rem; width: 100%; padding: 0 .875rem;
  background: hsl(var(--surface-alt));
  border: 1px solid hsl(var(--input)); border-radius: .625rem;
  color: hsl(var(--foreground)); font-size: .875rem;
  transition: border-color .18s ease, box-shadow .18s ease, background-color .18s ease;
}
.input::placeholder { color: hsl(var(--text-tertiary)); }
.input:hover { border-color: hsl(var(--border-hover)); }
.input:focus {
  outline: none; border-color: hsl(var(--violet)); background: hsl(var(--card));
  box-shadow: 0 0 0 3px hsl(var(--violet) / .22), 0 0 18px -6px rgba(var(--violet-rgb), .35);
}
.input:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 1px; }
.input:disabled { opacity: .5; cursor: not-allowed; background: hsl(var(--muted)); }
```

### Dialog / Sheet(弹窗一律统一风格,含遮罩)

```css
.overlay {
  background: hsl(var(--bg-rgb) / 0.72);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.panel {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 1rem;
  box-shadow: 0 24px 64px -16px rgba(0,0,0,.7);
  animation: panelIn .3s cubic-bezier(.16,1,.3,1) both;
}
@keyframes panelIn { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }
```

### Knowledge Graph 节点(ReactFlow 定制)

```css
/* 链接节点:紫罗兰描边 + 微光 */
.node-link {
  border: 1.5px solid hsl(var(--violet) / .55);
  background: hsl(var(--card));
  border-radius: .75rem;
  box-shadow: 0 0 0 1px hsl(var(--border)), 0 4px 16px -8px rgba(0,0,0,.6);
  transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.node-link:hover { border-color: hsl(var(--cyan)); box-shadow: 0 0 20px -4px rgba(var(--cyan-rgb), .45); transform: translateY(-2px); }
.node-link.selected { border-color: hsl(var(--violet)); box-shadow: 0 0 0 2px hsl(var(--violet) / .4), 0 0 28px -4px rgba(var(--violet-rgb), .55); }

/* 标签节点:青色虚线 */
.node-tag { border: 1.5px dashed hsl(var(--cyan) / .6); border-radius: 9999px; background: hsl(var(--card)); }
.node-tag:hover { border-style: solid; border-color: hsl(var(--cyan)); }

/* 连线:默认灰,悬停紫,选中紫 */
.react-flow__edge-path { stroke: hsl(var(--border-hover)); stroke-width: 1.5; }
.react-flow__edge:hover .react-flow__edge-path,
.react-flow__edge.selected .react-flow__edge-path { stroke: hsl(var(--violet)); stroke-width: 2; }
.react-flow__edge.animated .react-flow__edge-path { stroke-dasharray: 6 4; }
```

### Skeleton / EmptyState / TagManager

```css
/* 骨架屏:微光扫过(background-position 动画,非 blur) */
.skeleton {
  border-radius: .5rem;
  background: linear-gradient(100deg, hsl(var(--muted)) 40%, hsl(var(--surface-hover)) 50%, hsl(var(--muted)) 60%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}
@keyframes shimmer { from { background-position: 130% 0; } to { background-position: -30% 0; } }

/* 空状态:虚线容器 + 渐变光环图标底座 */
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: .875rem;
  padding: 3rem 1.5rem; border: 1.5px dashed hsl(var(--border)); border-radius: 1rem;
  background: hsl(var(--background) / .4);
}
.empty-state__icon {
  display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: 1rem;
  color: hsl(var(--violet));
  background: linear-gradient(135deg, hsl(var(--violet) / .18), hsl(var(--cyan) / .14));
  border: 1px solid hsl(var(--violet) / .3);
}
```

## 5. Layout Principles

**Container:**
- 工作台(瀑布流):`max-width: 1600px; padding-inline: 1.5rem`(桌面)/ `1rem`(移动)
- 设置页 / 详情页:内容主体 `max-width: 960px`,居中
- 登录页:卡片 `max-width: 440px`,全屏居中
- 顶栏内容:`max-width: 1600px` 与内容对齐

**Spacing Scale**(4px 基数):`4 / 8 / 12 / 16 / 20 / 24 / 32 / 48`
- Section padding: 垂直 `2rem`(页面级标题下 `1rem`)
- 卡片网格 gap: `20px`(瀑布流);Flex/Stack 组件间 `12px`
- 卡片内部 padding: `16px`

**Grid:**
```css
/* CSS 网格后备(标签管理、设置区;瀑布流由 LinkGridVirtual 按容器宽度算列数) */
.grid-auto {
  display: grid; gap: 1.25rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
/* 瀑布流目标列宽:卡片 min 300px,gap 20px → 1/2/3/4 列随宽度自动 */
```

## 6. Depth & Elevation

| Level | Treatment | 场景 |
|-------|-----------|------|
| Flat | 无阴影,仅 1px `--border` | 侧边栏、输入框、tab、chip |
| Subtle | `0 1px 2px rgba(0,0,0,.4)` + border | 卡片默认、下拉菜单 |
| Elevated | `0 12px 32px -12px rgba(0,0,0,.6)` | 卡片 hover、hover 态菜单 |
| Glow | 阴影 + `0 0 24px -6px rgba(var(--violet-rgb), .25~.55)` | 主 CTA、焦点环、图谱选中节点、活跃 chip |
| Overlay | `0 24px 64px -16px rgba(0,0,0,.7)` + `backdrop-filter: blur(8px)` | 弹窗、抽屉、确认框 |

- 暗色主题下"深度"主要由**边框渐亮 + 阴影 + 微光**三层表达,阴影不追求重;亮色主题阴影整体减半(改用 rgba(0,0,0,.12) 级别)。
- 同一层级内深度一致:卡片 hover 全部走 Elevated + 微光,不允许个别卡片加深。

## 7. Animation & Interaction

**Motion Philosophy**: 克制、一次性的 — 只动 `opacity / transform / background-position`,入场动画完成即释放;唯一允许无限循环的是背景光晕呼吸(transform-only)。
**Tier**: **L2 流畅交互**(签名动效 6 类齐备,见下表;项目为工具型应用,不做 L3 pin-scrub / WebGL / 自定义光标)

### Dependencies

无新依赖。落地映射:
- React 侧:`framer-motion`(已安装)负责 Hero 字符级入场、卡片 stagger、页面转场;
- 非 React 场景:IntersectionObserver + CSS class 切换(下方代码);
- SpotlightCard 的 `--mx/--my`:原生 pointermove + rAF 节流。
- 若后续从 [vue-bits](https://github.com/DavidHDev/vue-bits) 复制任何效果源码,须在 footer 注明致谢(MIT)。

### Signature Moments(6 类,与动效库映射)

| 类别 | 落点 | 实现 |
|------|------|------|
| Text — Hero H1 | 登录页「VibeVault」 | 字符级 stagger 入场(framer-motion)+ 渐变文字 |
| Text — Section H2 | 各页面标题 | ScrollReveal 式 fadeInUp(IO 触发,一次) |
| Text — Body / Label | eyebrow 标签(如 "MY COLLECTION") | 左短线 + 下划线展开 |
| 元素级 | 主 CTA、卡片 | 按钮 hover 发光 + active 按压;卡片 Spotlight |
| 交互构件 | LinkCard / 抽屉 | SpotlightCard + MobileSheet 弹簧滑入 |
| 氛围层 | 全局背景 | 极光呼吸光晕(transform-only,零 blur) |

### Base Setup(滚动 reveal + 聚光灯,vanilla 版)

```js
// 滚动 reveal
function initScrollReveal(selector = '.reveal') {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(selector).forEach(el => obs.observe(el));
}
// 卡片聚光灯(rAF 节流 + 仅 hover 设备)
function initSpotlight(selector = '.card') {
  if (!window.matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll(selector).forEach(el => {
    let raf = 0;
    el.addEventListener('pointermove', (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    }, { passive: true });
  });
}
document.addEventListener('DOMContentLoaded', () => { initScrollReveal(); initSpotlight(); });
```

### Entrance Animation(卡片 stagger + 页面转场)

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: none; }
}
.reveal { opacity: 0; transform: translateY(28px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
.reveal.in-view { opacity: 1; transform: none; }

/* framer-motion 版本(React 侧) */
const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.06, 0.6), duration: 0.7, ease: [0.16, 1, 0.3, 1] } }),
};
// 用于瀑布流卡片入场;虚拟滚动场景只对可视区首批卡片执行

/* 页面转场(已有 PageTransition,统一参数) */
.page-enter { animation: pageEnter .35s cubic-bezier(.16,1,.3,1) both; }
@keyframes pageEnter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
```

### Hover & Focus States(统一规则)

- 所有可交互元素必须有 hover + `:focus-visible` 环(`2px solid hsl(var(--ring))`,offset 2px)。
- 按钮 hover 只做「轻浮起 + 发亮」,active 统一 `scale(.97)`;不做 3D 翻转、不做磁吸(工具类克制)。
- 卡片 hover:浮起 3px + 边框点亮 + 聚光灯;图片 scale 1.045 仅限封面,不用于页面级大图。

### Special Effects

```css
/* 氛围层:两层极光光晕(radial-gradient 静态内容 + transform 漂移,零 filter/blur) */
.aurora { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.aurora::before, .aurora::after {
  content: ''; position: absolute; width: 62vmax; height: 62vmax; border-radius: 50%;
  background: radial-gradient(circle at center, rgba(var(--violet-rgb), .16), transparent 62%);
  animation: drift 28s ease-in-out infinite alternate;
}
.aurora::after {
  background: radial-gradient(circle at center, rgba(var(--cyan-rgb), .10), transparent 62%);
  animation-duration: 36s; animation-direction: alternate-reverse;
}
@keyframes drift {
  from { transform: translate3d(-8%, -6%, 0) scale(1); }
  to   { transform: translate3d(10%, 8%, 0) scale(1.15); }
}

/* 渐变文字(Hero 专用) */
.gradient-text {
  background-image: linear-gradient(135deg, hsl(var(--violet)), hsl(var(--cyan)));
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}

/* eyebrow 下划线展开 */
.eyebrow::after {
  content: ''; display: block; margin-top: .5rem; width: 0; height: 2px; border-radius: 2px;
  background-image: linear-gradient(90deg, hsl(var(--violet)), hsl(var(--cyan)));
  transition: width .45s cubic-bezier(.16,1,.3,1);
}
.eyebrow.in-view::after { width: 2.5rem; }

/* 图谱节点弹性入场(framer-motion) */
const nodeSpring = { type: 'spring', stiffness: 260, damping: 24, mass: .9 };
// 首批 ≤25 个节点做 stagger 入场(0.04s/个),其余静默渲染——大图谱不逐节点动画
```

**性能红线(本项目 L2 强制)**:
- 全页 `filter: blur()` = 0 个(聚光灯/光晕全部用 radial-gradient;`backdrop-filter` 仅顶栏 12px 与遮罩 8px)。
- `pointermove` 监听必须 rAF 节流;滚动监听 passive。
- 每屏 signature moment ≤ 2;移动端(< 640px)只保留卡片 fadeInUp + 聚光灯禁用。
- 图谱入场动画节点数上限 25;瀑布流虚拟滚动下仅可视区首批卡片有入场动画。

### Reduced Motion(必选降级)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important; animation-iteration-count: 1 !important;
    transition-duration: .01ms !important; scroll-behavior: auto !important;
  }
  .aurora::before, .aurora::after { animation: none; }
  .card:hover { transform: none; }
  .card:hover .card-cover { transform: none; }
}
```

## 8. Do's and Don'ts

### Do

1. 暗色是品牌默认(`<html class="dark">`),亮色为同基因变体,所有颜色仅经 CSS 变量引用。
2. 内容优先:og:image / favicon / 截图是主角,强调色只出现在交互元素上。
3. 卡片 hover 用 `transform + box-shadow + radial-gradient 聚光灯`,深度由「边框渐亮 + 阴影 + 微光」三层表达。
4. 动效只用 opacity / transform / background-position,一次性完成即释放;无限循环仅限背景光晕。
5. 中文排版铁律:正文 ≥ 15px、行高 ≥ 1.7、字距 0.02em;中文字族在前(Noto Sans SC)。
6. 每个可交互元素必有 hover 态 + `:focus-visible` 键盘环。
7. 触摸目标 ≥ 44×44px,图标按钮也须满足(不足时用 padding 撑)。
8. 图谱节点默认克制(细描边 + 轻阴影),只有 hover/选中才点亮——选中的节点发紫光,hover 发青光。
9. 加载与空状态也遵守视觉语言:skeleton 用 shimmer 扫光,空状态用渐变光环底座 + 虚线容器。
10. 渐变只属于四类:主 CTA、Hero 标题、活跃导航项、选中图谱节点;同屏 ≤ 2 处。

### Don't

- ❌ `filter: blur()` 施加在任何移动中的元素(包括光晕/blob)——一律用 radial-gradient 替代。
- ❌ `backdrop-filter: blur()` 超过 14px,或让它覆盖大面积滚动主体(顶栏 12px、遮罩 8px 是上限)。
- ❌ 自定义全局光标 / 磁吸按钮 / 鼠标拖影 — 工具类应用禁用,内容密度优先。
- ❌ 用纯色块或灰块占位代替 og:image / favicon(占位必须走 shimmer 骨架或真实图片)。
- ❌ 同屏超过 2 处渐变强调、或在 H2 及以下标题使用渐变/投影文字。
- ❌ 在用户自定义标签色上再叠加任何强调色遮罩(标签色是用户的,不是我们的)。
- ❌ 无限循环动画(呼吸光晕除外)、GSAP pin-scrub / scroll-jacking / WebGL 背景 — L2 不引入。
- ❌ 用 emoji 当图标 — 一律 lucide-react(已有依赖);图形内 SVG 直接内联。
- ❌ 回退到 shadcn 默认蓝灰色板数值(本规范已整体替换 `globals.css` token,新增页面不得复用旧值)。
- ❌ 在瀑布流/图谱这种数据区做逐帧滚动监听驱动的大范围动画(虚拟滚动已足够,动画只服务「入场」与「悬停」)。

## 9. Responsive Behavior

**Breakpoints:**

| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | > 1280px | 侧边栏 240px 常驻;瀑布流 4 列;顶栏完整 |
| Laptop | 1024–1280px | 侧边栏常驻;瀑布流 3 列 |
| Tablet | 640–1024px | 侧边栏收起 → 汉堡 + MobileSheet 抽屉;瀑布流 2 列;FilterBar 换行 |
| Mobile | < 640px | 瀑布流 1 列;顶栏只留关键操作;抽屉全宽;图谱节点加大标注、禁 hover 特效 |

**Touch Targets:** minimum **44×44px**(全部按钮/图标按钮/chip 交互区)。

**Collapsing Strategy:**
- 侧边栏:< 1024px 隐藏,入口在顶栏汉堡按钮,打开 MobileSheet(spring 滑入,遮罩同 Dialog)。
- FilterBar:搜索框占满整行,排序/视图切换/添加按钮换行堆叠;添加按钮保底固定右下角悬浮(44px 圆形渐变按钮)。
- 图谱:移动端 `touch-action: none` 交给 ReactFlow 手势,默认放大节点标注、隐藏标签节点文字(或改为缩放显示)。

```css
/* 瀑布流列数(LinkGridVirtual 按容器宽度算:>= 1280 四列 / >= 1024 三列 / >= 640 两列 / 其余单列) */
.pw-grid { column-gap: 1.25rem; }
@media (max-width: 640px) {
  .pw-grid { column-gap: .875rem; }
}

/* 移动端主 CTA 悬浮(FilterBar 折叠后保底入口) */
@media (max-width: 640px) {
  .fab-add {
    position: fixed; right: 1rem; bottom: 1rem; z-index: 40;
    width: 3rem; height: 3rem; border-radius: 9999px;  /* ≥48px 触摸目标 */
    display: grid; place-items: center;
    background-image: linear-gradient(135deg, hsl(var(--violet)), hsl(var(--cyan)));
    color: hsl(var(--primary-foreground));
    box-shadow: 0 8px 24px -8px rgba(var(--violet-rgb), .6);
  }
  .fab-add:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 2px; }
}

/* 移动端关闭聚光灯/光晕缩小,防性能抖动 */
@media (max-width: 640px) {
  .card::before { display: none; }
  .aurora { opacity: .7; }
}
```

---

## 工程接线备忘(Phase C 用)

- `globals.css`:`:root` / `.dark` 两块 token 整体替换(保留 `@tailwind` 指令与 `.glass` 类,`--radius: 0.75rem` 已含);新增 `.gradient-accent`、`.gradient-text`、`.aurora`、`.eyebrow` 工具类。
- `tailwind.config.js`:扩展 `violet: 'hsl(var(--violet))'`、`cyan: 'hsl(var(--cyan))'`、`surface: { alt: 'hsl(var(--surface-alt))', hover: 'hsl(var(--surface-hover))' }`、`borderHover: 'hsl(var(--border-hover))'` 等,其余 shadcn 映射不变。
- `layout.tsx`:默认 `<html class="dark">`;登录页(lib 中无目录,挂 `src/app/page.tsx`)加 `.aurora` 背景层 + Hero 渐变标题。
- `AppShell`:顶栏加 scrolled 态;`LinkCard` 接 `--mx/--my` 聚光灯;`LinkGridVirtual` 首批卡片加 fadeInUp;图谱页面接 node/edge 定制 class。
- 主题切换若要 UI:顶栏加太阳/月亮按钮(`lucide-react` 的 `Sun`/`Moon`),翻转 `html.dark` 即可,无需 next-themes 依赖。
