好，现在你已经有了两份“圣经”级文档：

* 《元征产品需求 V2》 = **做什么 & 怎么体验** 
* 《Schema V2》 = **数据世界的真相** 

接下来就是：**怎么用 Cursor 把它们一步步变成完整的软件工程体系**。

我给你的是一个“给 Cursor 用的工程总计划”，你可以按阶段复制片段进 Cursor 的 Prompt，让它照着执行——**每个阶段都显式要求它先读文档再动手**，确保不偏航。

---

## 总体节奏：4 个阶段 + 1 条底线

**阶段：**

1. 基础架构 & 环境（Backend + DB + Frontend 骨架）
2. 后端领域模型 & API（按模块分批）
3. 前端页面 & 交互（按模块分批）
4. 集成、权限、审计、优化 & 验收

**底线：**

> **任何代码修改前，Cursor 必须将《PRD V2》和《Schema V2》作为事实来源，不得私自改表结构、不随意删字段。**

你可以把下面这些“约束”写进 Cursor 的长期系统提示里。

---

## 0. 给 Cursor 的“总系统提示模版”

**你在 Cursor 的 `system`/`项目描述`里可以放类似这样一段（可精简）：**

> * 本项目是「元征 · 合伙人赋能平台」的实现。
> * 需求来源：
>
>   * 《元征 · 合伙人赋能平台 产品需求文档（PRD v2）》
>   * 《元征 · 合伙人赋能平台 – Schema V2》
> * 所有业务逻辑、接口字段、表结构、状态机必须与这两份文档保持一致，如有冲突，以 PRD+Schema 为准，不得私自更改数据库结构。
> * 技术栈约定：
>
>   * 后端：Python 3.11 + FastAPI + SQLAlchemy 2.x + Alembic + PostgreSQL
>   * 前端：React + TypeScript（推荐 Next.js）+ Tailwind CSS + GSAP（动画）
> * 所有时间字段 `timestamptz`，所有金额使用 `numeric(18,2)`，软删统一用 `is_deleted boolean`。
> * `visibility_*`、`role_level`、Token 账本逻辑、状态枚举必须严格参照 Schema V2。

---

## 1. 阶段一：基础架构 & 环境搭建

### 1.1 目录结构规划

让 Cursor 在仓库根目录创建如下结构：

```text
/ backend/
  app/
    core/
    db/
    models/
    schemas/
    api/
      v1/
    services/
    tests/
/ frontend/
  app/ 或 src/
/ infra/
  docker-compose.yml
  migrations/ (Alembic)
```

> **给 Cursor 的 Prompt 示例：**

> 「请阅读《Schema V2.docx》和《元征产品需求V2.docx》，在当前仓库中生成上述目录结构，并初始化：
>
> * backend：FastAPI + SQLAlchemy + Alembic + PostgreSQL 的基础骨架
> * frontend：Next.js 13+ + TypeScript + Tailwind CSS + GSAP 的基础骨架
>   要求：
> * 为 Postgres 写一个 docker-compose，库名/用户/密码从 `.env` 读取。
> * backend 使用 `.env` 管理数据库连接字符串。
> * 不要修改 Schema V2 中的表名和字段名。」

### 1.2 后端基础（FastAPI + DB + Alembic）

让 Cursor 完成：

* `app/core/config.py`：读取 env（DB_URL、JWT_SECRET 等）。
* `app/db/session.py`：SessionLocal + engine。
* `app/db/base.py`：统一导入 models。
* `app/main.py`：创建 FastAPI 实例，挂载健康检查路由。
* Alembic 初始化：`alembic.ini`、`backend/migrations`。

要求 Cursor：

* **不要自己设计表结构**，只负责先搭好迁移框架，模型稍后按 Schema V2 填。

### 1.3 前端基础（Next.js + Tailwind + GSAP）

让 Cursor 做：

* `npx create-next-app frontend --ts` 或类似；
* 集成 Tailwind CSS（官方教程那一套）；
* 安装 `gsap`，创建一个简单的 Demo 组件验证动画没问题；
* 创建基础布局组件：

  * 顶部栏 + 侧边导航骨架（Dashboard/Projects/Resources/News/Meetings/Community/Partners/Votes/Profile）。

---

## 2. 阶段二：后端领域模型 & API（按模块迭代）

这里的策略是：**严格按 Schema V2 的模块顺序来**，每个子阶段只做几张表 + 对应 API，完成后再进入下一块。

### 2.0 给 Cursor 定一个统一模式

每个模块，对 Cursor 都这样要求：

1. **先读文档**：

   * 找到 PRD V2 中对应模块章节（例如 6.1 / 6.2 / 6.3...）。
   * 找到 Schema V2 中对应表和字段。
2. 在 `backend/app/models/` 中创建 SQLAlchemy 模型（与 Schema 完全一致）。
3. 在 `backend/app/schemas/` 中创建 Pydantic 模型（Create/Update/Read）。
4. 在 `backend/app/api/v1/xxx.py` 中创建路由：

   * CRUD + 列表 +必要的过滤；
   * 对权限（role_level、is_admin, visibility）做基础检查。
5. 在 `backend/app/services/` 写业务逻辑（可选，但建议）。
6. 写最少一两个 pytest 用例，验证主流程能跑。

下面按模块给出建议顺序。

---

### 2.1 模块 A：用户 & 角色 & 认证

**涉及表：**

* `users`, `roles`, `user_roles`, `user_personal_tags`, `user_personal_notes` 

**Cursor 任务拆解：**

1. 根据 Schema 建立 SQLAlchemy 模型。
2. 实现：

   * 注册（管理员创建 + 自助注册开关）
   * 登录（账号密码 + 邮箱/手机密码；验证码登录先作为 TODO）
   * 获取当前用户信息（含角色列表 & 最高 role_level & is_admin）。
   * 编辑个人信息（按 PRD 个人信息表单字段）。
3. 实现本地标签 & 备注 CRUD 接口（只允许 owner 操作）。
4. 做好密码加密、JWT 生成、中间件（依赖）：

> 可以要求 Cursor：
>
> > 「在 backend 实现 Auth 模块：models、schemas、router。JWT 放在 `Authorization: Bearer`。为后续 API 写一个 `get_current_user` 依赖，并在依赖中附带 role_level 与 is_admin。」

---

### 2.2 模块 B：Token 账户 & 交易

**表：** `token_accounts`, `token_transactions` 

**逻辑：** Token 初始额度、不透支、无系统池、交易状态机、管理员赠与/扣除、分红。

**Cursor 工作步骤：**

1. 按 Schema 建好模型。
2. 在用户创建时自动创建 `token_accounts`，balance=initial_balance（按角色）。
3. API 设计：

   * `GET /token/me/account`：返回当前用户余额与初始额度。
   * `GET /token/me/transactions`：分页查询自己的交易记录。
   * `POST /token/transactions`：发起转账申请（普通用户）。
   * `POST /admin/token/transactions/{id}/approve` / `reject`：管理员审批。
   * `POST /token/transactions/{id}/confirm`：收款方确认。
   * `POST /admin/token/grant` / `/deduct`：管理员赠与/扣除。
   * `POST /admin/token/dividend`：项目分红型批量转账。
4. 在服务层实现状态机和余额更新：

   * 只有在 `COMPLETED` 时才更新 `balance`；
   * 阻止任何导致余额<0 的操作；
   * 所有操作写入 `AuditLog`（后面模块）。

> 提醒 Cursor：
>
> * “不得自己简化状态，只能使用 Schema 中状态枚举；不得修改金额类型。”

---

### 2.3 模块 C：项目域（Project + Members + Shares + Join Requests + Events）

**表：**

* `projects`, `project_relations`, `project_members`, `project_shares`, `project_join_requests`, `project_events` 

**功能对应 PRD：** 6.3 + 6.4（发布项目、加入项目、股权结构、时间线等）。

**Cursor 分步：**

1. 用 Schema 建模：

   * 注意 `review_status` + `business_status` + `visibility_*`。
   * `project_events` 要包含所有关联字段。

2. 项目路由：

   * `POST /projects`：仅联合创始人 + 管理员；写入 `PENDING_REVIEW`；根据表单处理 initial share & members。
   * `GET /projects`：过滤 by status/role/visibility。
   * `GET /projects/{id}`：详情 + 股权 + 成员 + 部分事件（分页）。
   * `POST /admin/projects/{id}/review`：审批通过/驳回。

3. 加入项目：

   * `POST /projects/{id}/join-requests`：生成 `project_join_requests`。
   * `POST /projects/join-requests/{id}/review`：负责人/管理员审批；通过时更新 `project_members` + `project_shares`（如有实际股份）、写 `ProjectEvent`。

4. 股权结构调整：

   * `POST /projects/{id}/shares/adjust`：负责人/管理员；更新 `project_shares` + 写 `ProjectEvent`，包含 `share_change_snapshot`。

5. 时间线 API：

   * `GET /projects/{id}/events`：按时间分页，支持按 event_type 过滤。
   * `POST /projects/{id}/events`：新增 NOTE/MILESTONE 等“手工事件”。
   * “更正事件”：`POST /projects/events/{event_id}/correction` → 新增一条 `EVENT_CORRECTED`。

---

### 2.4 模块 D：需求 & 响应 & 修改/废弃

**表：** `demands`, `demand_participants`, `demand_responses`, `demand_response_change_requests` 

**功能对应 PRD：** 6.3.5–6.3.7。

**Cursor 实现：**

1. `POST /projects/{id}/demands`：

   * 如果前端传多个项目 ID，就在服务层循环创建多条 `demands` 并设置 group_id。
2. `GET /projects/{id}/demands`：按状态/可见范围列出。
3. `POST /demands/{id}/responses`：创建 `demand_responses`。
4. `POST /demands/responses/{id}/review`：由需求 owner 接受/拒绝；接受后设置 `ACCEPTED_PENDING_USAGE` + 填 final_reward。
5. `POST /demands/responses/{id}/mark-used`：负责人确认资源已使用，触发建议 Token 交易（可返回一个预填数据给前端）。
6. `POST /demands/responses/{id}/change-requests`：创建修改/废弃请求 → 推给资源方 → 再推管理员；

   * 对应状态机落在 `demand_response_change_requests.status`。

每个重要操作同步写 `project_events`（DEMAND_PUBLISHED / DEMAND_RESPONDED / DEMAND_ACCEPTED / DEMAND_RESPONSE_ABANDONED / DEMAND_RESPONSE_MODIFIED 等）。

---

### 2.5 模块 E：资源、新闻、会议、社群、投票、信箱、价值、审计

这里可以再拆小步骤，建议顺序：

1. 资源模块（resources + tags）
2. 新闻模块（news_sources + news + project_news_links）
3. 会议 & 时间表（meetings + external_guests + meeting_minutes + user_availability）
4. 社群 & 反馈 & DM（posts/comments/likes/feedbacks/dm_threads/dm_messages）
5. 投票（votes/vote_options/vote_records）
6. 公告 & 信箱（announcements/inbox_items）
7. 价值 & 审计（value_records/audit_logs）

每个子模块都照 2.0 的统一模板来：读 PRD 章节 → 对应 Schema → 模型/路由/权限/简单测试。

**特别提醒 Cursor：**

* 资源检索/资源探索 & 新闻数字人 **只需要先留 API 占位**（例如 `/ai/resources/search`），内部可以先 mock；真正接 AI 你可以后面再做。
* 会议模块要支持 invited_by_user_id，用于统计“谁邀请了外部嘉宾”。
* 投票模块要严格实现“结果标准 pass_rule”字段，但通过与否可以暂由人工解释。
* inbox_items 的 `category` 和 `related_object_*`，要在各模块的业务逻辑里被调用（比如发起 Token 交易→给管理员塞一条 SYSTEM；新公告→给所有人塞 ANNOUNCEMENT；被 @ → MENTION；DM → DM）。

---

## 3. 阶段三：前端实现（按模块）

前端建议用 **页面 → 视图组件 → API 客户端 → 状态管理** 的模式来。

### 3.1 通用基础

让 Cursor：

1. 搭一个 `apiClient`（封装 fetch/axios），统一加 JWT Header。
2. 写一个 `authStore`（Zustand/Redux）保存当前用户、角色、token。
3. 实现「登录/注册/退出」页面，和简单的路由守卫：

   * 未登录访问业务路由 → 重定向 /login。

### 3.2 布局和导航（先一次性搞定）

按照 PRD 顶层导航：Dashboard / Projects / Resources / News / Meetings / Community / Partners / Votes / Profile。

---

### 3.3 按迭代优先级实现页面

建议把前端也拆成 **M1/M2/M3**：

#### M1（和后端 M1 对齐）：核心闭环

* 登录 / 注册 / 忘记密码
* 仪表盘基础：

  * 我的项目列表 + 红点
  * 我的 Token 卡片 + 交易列表
* 项目列表、项目详情（含时间线 Tab 的只读视图）
* 需求 & 响应前端表单
* Token 转账前端表单
* 用户个人中心基础（查看/编辑个人信息）

**给 Cursor 的提示点：**

> * 所有表单字段必须严格对齐 PRD 中的表单描述（例如“新建项目表单”、“需求发布表单”、“响应需求表单”、“Token 转账申请表单”等）。
> * 动作完成后用 Toast 提示，刷新相关数据。

#### M2：资源 + 新闻 + 会议

* 资源模块页面：我的资源 / 资源搜索 / 资源探索（聊天 UI + 先连 fake AI）。
* 新闻列表 + 项目相关新闻区块。
* 日常座谈会：

  * 时间表示图；
  * 座谈会列表/详情/纪要页。

**提示 Cursor：**

> * 资源卡片要显示关系强度（1–5 星）与可见范围 hint。
> * 新闻卡片要显示标题/来源/时间 + “查看原文”按钮。
> * 日历建议用现成日历组件 + 自己的样式，结合 GSAP 做小动效即可。

#### M3：社群 + 投票 + 合伙人列表 + 管理员控制台

* 社群流页面：发动态、评论、点赞、@。
* 意见反馈页面。
* 投票列表/详情/投票弹窗。
* 合伙人列表 & 个人主页（他人） + 本地标签/备注编辑 UI。
* 管理员控制台几个核心界面：

  * 项目审核列表
  * Token 总览
  * 价值记录录入
  * 反馈列表
  * 公告发布

---

## 4. 阶段四：集成、权限、审计、验收

### 4.1 权限与可见性验证

让 Cursor 帮你写一套“访问控制中间件逻辑”：

* 后端统一函数：

  * `check_visibility(user, obj.visibility_*)`
  * `require_role_level(user, min_level)`
* 写几组 pytest，验证：

  * 普通合伙人不能发起项目；
  * 低层级用户不能将高层级排除在可见范围之外；
  * 不同角色登录访问同一项目/资源看到的列表是否符合 PRD。

### 4.2 审计日志打点

让 Cursor 搜索所有「危险操作」：

* 删除资源/动态/评论/公告
* 管理员赠与/扣除 Token
* 项目状态变更
* 股权结构调整
* 管理员裁决“响应修改/废弃”

并统一在服务层写入 `audit_logs`，检查字段 `action`、`object_type`、`object_id`、`summary`。

写一个简单的 `GET /admin/audit-logs` 接口用于查询（管理员用）。

### 4.3 E2E/集成验证用例

让 Cursor 设计几个「端到端场景」脚本（可以是文档或自动化测试）：

1. **典型项目闭环**：

   * 联合创始人发起项目 → 管理员审核 → 发布需求 → 核心/普通响应 → 被接受 → 资源使用 → Token 结算 → 记录结案价值。

2. **响应修改/废弃场景**：

   * 响应被接受但未使用 → 负责人发起废弃 → 资源方拒绝 → 管理员裁决。

3. **座谈会 & 外部嘉宾贡献**：

   * 合伙人维护可用时间 → 管理员选定座谈会 → 会后记录外部嘉宾与邀请人 → 仪表盘“我的贡献”中可看到邀请记录。

4. **投票 & 公告 & 信箱通知**：

   * 管理员发公告 → 所有人信箱收到 ANNOUNCEMENT；
   * 管理员发起投票 → 可见范围内的合伙人信箱收到 VOTE；
   * 有人在动态里 @ 某人 → 被 @ 人信箱收到 MENTION。

让 Cursor 写这些场景的「步骤 + 期望结果」文档，未来你可以再让它转换成自动化测试脚本。

