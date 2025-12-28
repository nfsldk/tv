# CineStream AI

<div align="center">

![CineStream AI](https://img.shields.io/badge/CineStream-AI-22c55e?style=for-the-badge&logo=google&logoColor=white)

**A Next-Gen Streaming Platform with P2P Acceleration & Gemini AI**

[English Guide](#english-guide) | [中文部署教程](#chinese-guide)

</div>

---

<div id="english-guide"></div>

## 🇬🇧 Deployment & Setup Guide

CineStream AI is a modern video streaming platform. To get it running with all features (AI Assistant & Cloud Sync), follow these steps.

### 🚀 1. Fast Deployment

#### Option A: Vercel (Recommended)
1.  **Fork** this repository to your GitHub.
2.  Import the project in [Vercel](https://vercel.com/).
3.  Add **Environment Variables**:
    *   `API_KEY`: Your Google Gemini API Key ([Get it here](https://aistudio.google.com/)).
    *   `VITE_SUPABASE_URL`: (Optional) Supabase Project URL.
    *   `VITE_SUPABASE_KEY`: (Optional) Supabase Anon Key.
4.  Click **Deploy**.

#### Option B: Cloudflare Pages
1.  Create a new project in **Workers & Pages**.
2.  Connect your Git repo.
3.  **Build Settings**: Framework `Vite`, Command `npm run build`, Output `dist`.
4.  Add the same **Environment Variables** (Plain text).

---

### 🗄️ 2. Database Configuration (Cloud Sync)

To sync your custom resource sites across devices, you need a **Supabase** instance.

1.  Create a project at [supabase.com](https://supabase.com).
2.  Run this in the **SQL Editor**:
```sql
create table cine_sources (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  api text not null,
  active boolean default true
);

alter table cine_sources enable row level security;
create policy "Enable all access" on cine_sources for all using (true) with check (true);
```
3.  Copy `API URL` and `anon key` to your deployment platform variables.

---

### 📱 3. PWA Installation
- **iOS**: Open in Safari -> Share -> **Add to Home Screen**.
- **Android/PC**: Click the **Install** button in the Settings menu or address bar.

---

<div id="chinese-guide"></div>

## 🇨🇳 完整安装与部署教程

CineStream AI 具备 **P2P 播放加速**、**Gemini AI 助手**及**云端同步**功能。请按照以下步骤进行配置。

### 🚀 1. 快速部署

#### 方案 A：Vercel (最简单)
1.  **Fork** 本项目到您的 GitHub 账号。
2.  在 [Vercel](https://vercel.com/) 中点击 "Add New Project" 并导入。
3.  配置 **环境变量 (Environment Variables)**：
    *   `API_KEY`: 您的 Gemini API 密钥（在 [Google AI Studio](https://aistudio.google.com/) 免费获取）。
    *   `VITE_SUPABASE_URL`: (可选) Supabase 项目地址。
    *   `VITE_SUPABASE_KEY`: (可选) Supabase Anon 密钥。
4.  点击 **Deploy** 即可。

#### 方案 B：Cloudflare Pages
1.  在 Cloudflare 控制台选择 **Workers & Pages** -> **创建应用程序**。
2.  **构建设置**：框架预设选择 `Vite`，构建命令 `npm run build`，输出目录 `dist`。
3.  在变量设置中添加上述环境变量（选择明文类型）。

---

### 🗄️ 2. 配置云端同步 (Supabase)

如果您希望在不同设备上看到相同的资源站配置，请配置数据库：

1.  在 [Supabase](https://supabase.com) 创建新项目。
2.  在 **SQL Editor** 中运行以下指令创建表：
```sql
create table cine_sources (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  api text not null,
  active boolean default true
);

-- 开启行级安全（建议个人使用直接开启全访问策略）
alter table cine_sources enable row level security;
create policy "Enable all access" on cine_sources for all using (true) with check (true);
```
3.  获取项目的 `API URL` 和 `anon key` 填入部署平台的环境变量。

---

### 🛠️ 3. 管理员功能说明
- **进入后台**：点击右上角齿轮图标。
- **默认密码**：`5573108` (可在 `SettingsModal.tsx` 中搜索修改)。
- **添加资源**：支持所有兼容苹果 CMS (Maccms) 格式的 JSON API。

---

### 📱 4. PWA 应用安装
- **iOS**: 使用 Safari 打开，点击“分享” -> **添加到主屏幕**。
- **Android/PC**: 在浏览器设置或地址栏点击“安装 CineStream”，即可像原生 App 一样使用（支持离线缓存）。

---

### 💻 本地开发
```bash
npm install
npm run dev
```

**License**: MIT. Enjoy your cinema! 🍿