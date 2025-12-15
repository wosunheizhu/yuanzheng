# 元征 · 合伙人赋能平台

> 记录协作、量化贡献、可视化项目与平台价值的内部基础设施

## 项目概述

元征是一个聚焦金融行业的合伙人协作网络平台，主要服务于一级市场、二级市场和1.5级市场（协议转让等特殊场景）的金融从业者。

### 核心功能

- **项目管理**：创建和管理协作项目，跟踪项目进程
- **需求与响应**：发布需求，响应合伙人请求
- **Token 系统**：量化贡献，记录协作价值
- **资源管理**：发布和检索合伙人资源（支持 AI 检索）
- **座谈会管理**：安排会议，记录外部嘉宾
- **社群交流**：动态分享、私信、投票等

## 技术栈

### 后端
- **Python 3.11**
- **FastAPI** - 高性能 Web 框架
- **SQLAlchemy 2.x** - ORM
- **Alembic** - 数据库迁移
- **PostgreSQL** - 数据库
- **JWT** - 身份认证

### 前端
- **Next.js 14** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS** - 样式
- **GSAP** - 动画
- **Zustand** - 状态管理

## 项目结构

```
├── backend/                 # 后端项目
│   ├── app/
│   │   ├── api/            # API 路由
│   │   ├── core/           # 核心配置
│   │   ├── db/             # 数据库
│   │   ├── models/         # SQLAlchemy 模型
│   │   ├── schemas/        # Pydantic 模式
│   │   ├── services/       # 业务逻辑
│   │   └── tests/          # 测试
│   ├── migrations/         # Alembic 迁移
│   └── requirements.txt
│
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React 组件
│   │   ├── lib/           # 工具函数
│   │   └── store/         # 状态管理
│   └── package.json
│
├── infra/                  # 基础设施
│   └── docker-compose.yml
│
└── src/                    # 首页展示（原有）
```

## 快速开始

### 1. 启动数据库

```bash
cd infra
docker-compose up -d
```

### 2. 启动后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境配置
cp .env.example .env

# 运行数据库迁移
alembic upgrade head

# 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

### 3. 启动前端

```bash
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 4. 访问应用

- 首页展示：http://localhost:3847
- 管理平台：http://localhost:3000
- API 文档：http://localhost:8000/docs

## 角色权限

| 角色 | 层级 | Token 初始额度 | 特殊权限 |
|------|------|--------------|---------|
| 联合创始人 | 3 | 100,000 | 可发起项目 |
| 核心合伙人 | 2 | 30,000 | - |
| 普通合伙人 | 1 | 10,000 | - |
| 管理员 | 叠加 | - | 审核、账号管理、价值记录 |

## 开发规范

### 文档参考

所有开发必须参考以下文档：
- `产品需求V2.md` - 产品需求文档（PRD）
- `schemaV2.md` - 数据库 Schema 设计

### 代码规范

- 后端遵循 PEP 8
- 前端使用 ESLint + Prettier
- 所有时间使用 `timestamptz`（UTC）
- 金额使用 `numeric(18,2)`
- 软删除使用 `is_deleted` 字段

## 许可证

私有项目 - 保留所有权利

