下面是基于《元征 · 合伙人赋能平台 PRD v2》整理的、**完整且自洽的 Schema 文档（V2）**。
目标是：只要按这个 Schema 落库，就能覆盖 PRD v2 里定义的**所有业务对象、流程和表单字段**，且和我们讨论过的规则完全一致。

为阅读方便，我保持和你之前的习惯类似：

* 数据库假定为 **PostgreSQL**。
* 所有时间统一用 `timestamptz`。
* 金额/数量用 `numeric(18,2)` 或适当精度。
* 需要软删的表统一有 `is_deleted boolean`。
* 多处复用的“可见范围”字段统一一套定义。

---

````markdown
# 元征 · 合伙人赋能平台 – Schema V2

> 数据库建议：PostgreSQL  
> 时间类型统一：`timestamptz`（UTC 存储）  
> 货币/数量统一：`numeric(18,2)`  
> JSON：统一使用 `jsonb`  

本 schema 与《PRD v2》完全对齐，覆盖所有模块：  
账号与角色、可见性、Token 账本、项目/需求/响应、项目时间线、资源与 AI 检索、新闻与爬虫、座谈会与时间表、社群动态/反馈/私信、投票、信箱/公告、平台价值记录与审计。:contentReference[oaicite:1]{index=1}  

---

## 0. 全局约定

### 0.1 通用字段

大部分业务表采用以下通用字段：

- `created_at timestamptz`
- `updated_at timestamptz`
- `is_deleted boolean default false`  — 软删标记（如适用）

### 0.2 可见范围字段（Visibility）

以下对象需要“可见范围”控制（PRD 已明确）：:contentReference[oaicite:2]{index=2}  

- 项目、需求、资源、座谈会、用户时间表、新闻与项目关联视图（前端逻辑）、  
  社群动态、投票、公告、部分信箱消息等

统一字段：

- `visibility_scope_type varchar not null`  
  - `ALL`              — 所有合伙人可见  
  - `ROLE_MIN_LEVEL`   — 指定最低角色等级可见（及以上）  
  - `CUSTOM`           — 自定义用户集合  
- `visibility_min_role_level int null`  
  - 当 `visibility_scope_type = 'ROLE_MIN_LEVEL'` 时使用  
  - 1=普通及以上，2=核心及以上，3=仅联合创始人（及管理员）  
- `visibility_user_ids jsonb null`  
  - 当 `visibility_scope_type = 'CUSTOM'` 时使用  
  - 形如 `[1, 2, 3]`（用户 ID 列表）

**低级不能屏蔽高级约束（在应用层实现）：**:contentReference[oaicite:3]{index=3}  

- 当当前用户 `role_level = L` 且 `visibility_scope_type = 'CUSTOM'`：  
  - 在保存前，必须合并所有 `role_level > L` 的用户进 `visibility_user_ids`；  
  - 前端禁止取消这些勾选。  
- 当 `visibility_scope_type = 'ROLE_MIN_LEVEL'`：  
  - 不允许设置 `visibility_min_role_level > 当前用户 role_level`。

### 0.3 关键枚举（建议使用 PostgreSQL enum 或约定字符串）

- 角色层级（`roles.role_level`）  
  - 3 = 联合创始人  
  - 2 = 核心合伙人  
  - 1 = 普通合伙人  

- 项目审核状态（`projects.review_status`）  
  - `PENDING_REVIEW`  
  - `APPROVED`  
  - `REJECTED`  

- 项目业务状态（`projects.business_status`）  
  - `ONGOING`  
  - `PAUSED`  
  - `COMPLETED`  
  - `ABANDONED`  

- Token 交易状态（`token_transactions.status`）  
  - `PENDING_ADMIN_APPROVAL`  
  - `PENDING_RECEIVER_CONFIRM`  
  - `COMPLETED`  
  - `REJECTED`  
  - `CANCELLED`  

- Token 交易方向（`token_transactions.direction`）  
  - `TRANSFER`       — 普通合伙人之间转账  
  - `ADMIN_GRANT`    — 管理员赠与  
  - `ADMIN_DEDUCT`   — 管理员扣除  
  - `DIVIDEND`       — 项目分红  

- 需求状态（`demands.status`）  
  - `OPEN`  
  - `CLOSED`  
  - `CANCELLED`  

- 响应状态（`demand_responses.status`）  
  - `SUBMITTED`  
  - `ACCEPTED_PENDING_USAGE`  
  - `REJECTED`  
  - `ABANDONED`  

- 响应修改/废弃申请状态（`demand_response_change_requests.status`）  
  - `PENDING_PROVIDER`  — 已发给资源方  
  - `PENDING_ADMIN`     — 资源方拒绝，等待管理员裁决  
  - `APPROVED`          — 变更/废弃生效  
  - `REJECTED`          — 变更/废弃被管理员否决  

- 响应修改/废弃类型（`demand_response_change_requests.change_type`）  
  - `MODIFY`  
  - `ABANDON`  

- 会议级别（`meetings.meeting_level`）  
  - `INTERNAL`  
  - `EXTERNAL`  

- 会议保密等级（`meetings.confidentiality_level`）  
  - `LOW`  
  - `MEDIUM`  
  - `HIGH`  

- 会议状态（`meetings.status`）  
  - `PLANNING`  
  - `CONFIRMED`  
  - `CANCELLED`  
  - `FINISHED`  

- 会议参与角色（`meeting_participants.role`）  
  - `HOST`  
  - `ATTENDEE`  
  - `OPTIONAL`  

- 会议出席状态（`meeting_participants.attendance_status`）  
  - `INVITED`  
  - `ATTENDING`  
  - `DECLINED`  
  - `NO_SHOW`  

- 动态类型（`posts.post_type`）  
  - `GENERAL`  
  - `PROJECT`  
  - `RESOURCE`  
  - `VOTE`  
  - `ANNOUNCEMENT_REF`  

- 投票状态（`votes.status`）  
  - `OPEN`  
  - `CLOSED`  

- 信箱消息类别（`inbox_items.category`）  
  - `ANNOUNCEMENT`  
  - `SYSTEM`  
  - `VOTE`  
  - `DM`  
  - `MENTION`  

---

## 1. 身份与角色

### 1.1 `users`

```text
users
-----
id                bigserial PK
name              varchar                  -- 姓名
phone             varchar UNIQUE NULL      -- 手机（可选）
email             varchar UNIQUE NULL      -- 邮箱（可选）
avatar_url        varchar NULL             -- 头像 URL
organization      varchar NULL             -- 所属组织（公开与否由下方字段控制）
organization_public  boolean default true  -- 组织是否对其他人公开
title             varchar NULL             -- 职务头衔
gender            varchar NULL             -- 性别（可约定：MALE/FEMALE/OTHER）
birth_date        date NULL                -- 出生日期
intro             text NULL                -- 自我描述
expertise         text NULL                -- 擅长领域
contact           varchar NULL             -- 联系方式（例如备用微信/电话等）
contact_public    boolean default true     -- 联系方式是否公开
address           varchar NULL             -- 地址
address_public    boolean default false    -- 地址是否公开
education         text NULL                -- 教育经历
tags              jsonb NULL               -- 公开标签（["并购","新能源"]）
hobbies           text NULL                -- 爱好
signature         text NULL                -- 个性签名
hashed_password   varchar                  -- 加密密码
is_active         boolean default true     -- 是否有效
is_admin          boolean default false    -- 是否管理员
created_at        timestamptz
updated_at        timestamptz
is_deleted        boolean default false    -- 软删账号（禁用登录）
````

---

### 1.2 `roles` & `user_roles`

```text
roles
-----
id          serial PK
name        varchar           -- 展示名称：联合创始人/核心合伙人/普通合伙人
code        varchar UNIQUE    -- FOUNDING / CORE / NORMAL
role_level  int               -- 3/2/1
is_system   boolean default true

user_roles
----------
user_id   bigint FK -> users.id
role_id   int    FK -> roles.id
PRIMARY KEY (user_id, role_id)
```

---

### 1.3 个人本地标签 & 备注

#### 1.3.1 `user_personal_tags`

```text
user_personal_tags
------------------
owner_user_id   bigint FK -> users.id    -- 谁创建的标签
target_user_id  bigint FK -> users.id    -- 给谁打标签
tag             varchar                  -- 标签内容
created_at      timestamptz

PRIMARY KEY (owner_user_id, target_user_id, tag)
```

#### 1.3.2 `user_personal_notes`

```text
user_personal_notes
-------------------
id              bigserial PK
owner_user_id   bigint FK -> users.id    -- 备注所有者
target_user_id  bigint FK -> users.id    -- 被备注的人
content         text                     -- 备注内容
created_at      timestamptz
updated_at      timestamptz
is_deleted      boolean default false
```

---

## 2. Token 账户与账本

### 2.1 `token_accounts`

```text
token_accounts
--------------
user_id          bigint PK FK -> users.id
balance          numeric(18,2)          -- 当前余额
initial_balance  numeric(18,2)          -- 初始额度（100000/30000/10000）
created_at       timestamptz
updated_at       timestamptz
```

---

### 2.2 `token_transactions`

```text
token_transactions
------------------
id                   bigserial PK
from_user_id         bigint FK -> users.id NULL  -- 管理员赠与时可为 NULL
to_user_id           bigint FK -> users.id NULL  -- 管理员扣除时可为 NULL
amount               numeric(18,2)               -- 正数
direction            varchar                     -- TRANSFER / ADMIN_GRANT / ADMIN_DEDUCT / DIVIDEND
related_project_id   bigint FK -> projects.id NULL
related_demand_id    bigint FK -> demands.id NULL
status               varchar                     -- PENDING_ADMIN_APPROVAL / PENDING_RECEIVER_CONFIRM / COMPLETED / REJECTED / CANCELLED
reason               text NULL                   -- 发起理由
admin_comment        text NULL                   -- 管理员审批意见
created_by_user_id   bigint FK -> users.id       -- 发起人（管理员操作也填本人）
created_at           timestamptz
updated_at           timestamptz
```

> 余额更新逻辑完全由应用层在状态变为 `COMPLETED` 时执行。

---

## 3. 项目域（Projects）

### 3.1 `projects`

```text
projects
--------
id                    bigserial PK
name                  varchar           -- 项目名称
description           text              -- 项目简要描述
business_type         varchar           -- 协议转让 / 并购重组 / 产业赋能 / 债权业务 / 其他
industry              varchar NULL      -- 行业
region                varchar NULL      -- 地区

review_status         varchar           -- PENDING_REVIEW / APPROVED / REJECTED
business_status       varchar           -- ONGOING / PAUSED / COMPLETED / ABANDONED

created_by            bigint FK -> users.id    -- 发起人（联合创始人）
expected_status       varchar NULL             -- 审核通过后预期业务状态（可与 business_status 合并，按实现偏好）
created_at            timestamptz
updated_at            timestamptz
is_deleted            boolean default false

-- 可见范围
visibility_scope_type       varchar not null   -- ALL / ROLE_MIN_LEVEL / CUSTOM
visibility_min_role_level   int NULL
visibility_user_ids         jsonb NULL
```

---

### 3.2 `project_relations`（项目间链接关系）

```text
project_relations
-----------------
id                 bigserial PK
project_id         bigint FK -> projects.id             -- 当前项目
related_project_id bigint FK -> projects.id             -- 关联项目
relation_desc      text NULL                            -- 关系说明（如“前置项目”“并行项目”等）
created_at         timestamptz
created_by         bigint FK -> users.id
```

> 可按需要对称插入两条记录或在查询中做双向处理。

---

### 3.3 `project_members`

```text
project_members
---------------
project_id        bigint FK -> projects.id
user_id           bigint FK -> users.id
role_in_project   varchar            -- OWNER / MEMBER / RECORDER 等
duty_description  text NULL          -- 职责说明（尤其是负责人）
join_time         timestamptz
leave_time        timestamptz NULL

PRIMARY KEY (project_id, user_id)
```

---

### 3.4 `project_shares`（股权结构）

```text
project_shares
--------------
id             bigserial PK
project_id     bigint FK -> projects.id
owner_type     varchar            -- ORG / USER
owner_id       bigint             -- 若 ORG 则为组织 ID（可用固定常量），若 USER = users.id
percentage     numeric(10,4)      -- 股份比例（例如 10.0000）
effective_from timestamptz
note           text NULL
```

> 每次股权调整写入一组新记录，并在 `project_events` 中记录快照。

---

### 3.5 `project_join_requests`（加入项目申请）

```text
project_join_requests
---------------------
id                 bigserial PK
project_id         bigint FK -> projects.id
applicant_id       bigint FK -> users.id        -- 申请人
desired_role       varchar                      -- 申请身份：OWNER / MEMBER
duty_description   text                         -- 加入后职责
intended_share_pct numeric(10,4)                -- 意向获得股份（百分比）
note               text NULL                    -- 备注

status             varchar                      -- PENDING / APPROVED / REJECTED
reviewed_by        bigint FK -> users.id NULL   -- 审批人（负责人或管理员）
reviewed_at        timestamptz NULL
review_comment     text NULL                    -- 审批意见

created_at         timestamptz
updated_at         timestamptz
is_deleted         boolean default false
```

---

## 4. 需求 & 响应域（Demands & Responses）

### 4.1 `demands`

> “所属项目可多选”的实现方案：
> 对每个选择的项目创建一条 demand，并使用 `group_id` 将同源需求归组。

```text
demands
-------
id               bigserial PK
project_id       bigint FK -> projects.id     -- 所属项目（单个）
group_id         bigint FK -> demands.id NULL -- 同源需求的主 ID，首次创建时可设为自身 id
title            varchar                      -- 需求名称
description      text                         -- 需求内容描述
business_type    varchar                      -- 业务类型
industry         varchar NULL                 -- 需求行业

status           varchar                      -- OPEN / CLOSED / CANCELLED

expected_reward  jsonb NULL                  -- 激励形式：结构化，如 { "equity": "5%", "token": 1000, "other": "..." }

owner_user_id    bigint FK -> users.id       -- 需求 owner（管理人）
created_at       timestamptz
updated_at       timestamptz
is_deleted       boolean default false

-- 可见范围
visibility_scope_type       varchar not null
visibility_min_role_level   int NULL
visibility_user_ids         jsonb NULL
```

---

### 4.2 `demand_participants`（需求人，多人）

```text
demand_participants
-------------------
demand_id   bigint FK -> demands.id
user_id     bigint FK -> users.id
is_owner    boolean default false   -- 是否 owner（owner_user_id 也会在此表中标记）

PRIMARY KEY(demand_id, user_id)
```

---

### 4.3 `demand_responses`

```text
demand_responses
----------------
id                     bigserial PK
demand_id              bigint FK -> demands.id
responder_id           bigint FK -> users.id
proposal               text                    -- 响应方案描述
expected_reward        jsonb NULL              -- 响应者意向激励，如 { "equity": "3%", "token": 500 }
final_reward           jsonb NULL              -- 最终确认的激励条款
status                 varchar                 -- SUBMITTED / ACCEPTED_PENDING_USAGE / REJECTED / ABANDONED

created_at             timestamptz
updated_at             timestamptz
is_deleted             boolean default false
```

---

### 4.4 `demand_response_change_requests`（响应交易修改/废弃申请）

```text
demand_response_change_requests
-------------------------------
id                   bigserial PK
demand_id            bigint FK -> demands.id
response_id          bigint FK -> demand_responses.id
change_type          varchar        -- MODIFY / ABANDON
reason               text           -- 修改/废弃原因
new_reward           jsonb NULL     -- 新激励条款（change_type=MODIFY 或管理员裁决时使用），如 { "equity": "2%", "token": 200, "none": true }
note                 text NULL      -- 备注

requested_by_user_id bigint FK -> users.id    -- 需求 owner（负责人）
requested_at         timestamptz

status               varchar                 -- PENDING_PROVIDER / PENDING_ADMIN / APPROVED / REJECTED
provider_decision    varchar NULL            -- ACCEPT / REJECT（资源方决策）
provider_decided_at  timestamptz NULL

admin_user_id        bigint FK -> users.id NULL  -- 管理员裁决人
admin_decision       varchar NULL                -- APPROVE / REJECT
admin_decided_at     timestamptz NULL

created_at           timestamptz
updated_at           timestamptz
is_deleted           boolean default false
```

> 通过这个表，完整落地“资源未用/未达预期 → 修改/废弃 → 资源方接受/拒绝 → 管理员裁决”的流程。

---

## 5. 项目时间线（ProjectEvent）

### 5.1 `project_events`

```text
project_events
--------------
id                      bigserial PK
project_id              bigint FK -> projects.id
event_type              varchar         -- 详见事件枚举列表
title                   varchar         -- 时间线短标题
description             text NULL       -- 详细描述（Markdown/富文本）

created_by_user_id      bigint FK -> users.id
created_at              timestamptz

-- 关联业务对象（可选）
related_demand_id       bigint FK -> demands.id NULL
related_response_id     bigint FK -> demand_responses.id NULL
related_transaction_id  bigint FK -> token_transactions.id NULL
related_meeting_id      bigint FK -> meetings.id NULL
related_news_id         bigint FK -> news.id NULL
related_value_record_id bigint FK -> value_records.id NULL

-- 状态变更信息（可选）
old_status              varchar NULL
new_status              varchar NULL

-- 股权结构快照（在股权调整等场景）
share_change_snapshot   jsonb NULL

-- 通用扩展字段（比如里程碑细节、外部会议信息等）
payload                 jsonb NULL
```

> 所有关键业务动作（项目创建、成员加入、股权调整、需求/响应流程、资源使用/废弃、Token 交易、会议、新闻关联、结案价值记录等）都在此表中留痕。

---

## 6. 资源域（Resources）

### 6.1 `resources`

```text
resources
---------
id                     bigserial PK
owner_user_id          bigint FK -> users.id        -- 发布者
org_name               varchar                      -- 所属机构
description            text                         -- 资源描述
relationship_strength  int                          -- 1-5 分
industry               varchar NULL
region                 varchar NULL
note                   text NULL                    -- 备注
status                 varchar default 'ACTIVE'     -- ACTIVE / PAUSED / EXPIRED

created_at             timestamptz
updated_at             timestamptz
is_deleted             boolean default false

-- 可见范围
visibility_scope_type       varchar not null
visibility_min_role_level   int NULL
visibility_user_ids         jsonb NULL
```

---

### 6.2 `resource_tags` & `resource_tag_links`

```text
resource_tags
-------------
id        serial PK
name      varchar UNIQUE

resource_tag_links
------------------
resource_id  bigint FK -> resources.id
tag_id       int    FK -> resource_tags.id
PRIMARY KEY (resource_id, tag_id)
```

---

## 7. 新闻域（News）

### 7.1 `news_sources`

```text
news_sources
------------
id                         bigserial PK
name                       varchar
type                       varchar          -- RSS / HTML / API
base_url                   varchar
fetch_frequency_minutes    int              -- 抓取频率
parse_rule                 jsonb            -- 解析规则配置
default_tags               jsonb NULL       -- 默认标签数组
is_active                  boolean default true
created_at                 timestamptz
updated_at                 timestamptz
```

---

### 7.2 `news`

```text
news
----
id               bigserial PK
title            varchar
summary          text NULL             -- 摘要（爬虫/AI 生成）
source_name      varchar NULL          -- 来源名称
original_url     varchar UNIQUE        -- 原文 URL
publish_time     timestamptz NULL      -- 新闻发布时间
fetched_at       timestamptz NULL      -- 抓取时间
tags             jsonb NULL            -- 标签数组
added_by_user_id bigint FK -> users.id NULL  -- 手动添加人（爬虫导入为 NULL）
created_at       timestamptz
updated_at       timestamptz
is_deleted       boolean default false
```

---

### 7.3 `project_news_links`

```text
project_news_links
------------------
project_id        bigint FK -> projects.id
news_id           bigint FK -> news.id
linked_by_user_id bigint FK -> users.id
linked_at         timestamptz

PRIMARY KEY (project_id, news_id)
```

---

## 8. 日常座谈会 & 时间表

### 8.1 `meetings`

```text
meetings
--------
id                     bigserial PK
title                  varchar             -- 会议主题
description            text NULL           -- 简介 / 议题
meeting_level          varchar             -- INTERNAL / EXTERNAL
confidentiality_level  varchar             -- LOW / MEDIUM / HIGH
related_project_id     bigint FK -> projects.id NULL

start_time             timestamptz
end_time               timestamptz
location               varchar NULL        -- 地点/线上链接

created_by_user_id     bigint FK -> users.id
status                 varchar             -- PLANNING / CONFIRMED / CANCELLED / FINISHED
created_at             timestamptz
updated_at             timestamptz
is_deleted             boolean default false

-- 可见范围
visibility_scope_type       varchar not null
visibility_min_role_level   int NULL
visibility_user_ids         jsonb NULL
```

---

### 8.2 `meeting_participants`

```text
meeting_participants
--------------------
meeting_id         bigint FK -> meetings.id
user_id            bigint FK -> users.id
role               varchar          -- HOST / ATTENDEE / OPTIONAL
attendance_status  varchar          -- INVITED / ATTENDING / DECLINED / NO_SHOW

PRIMARY KEY (meeting_id, user_id)
```

---

### 8.3 `external_guests`

```text
external_guests
---------------
id             bigserial PK
meeting_id     bigint FK -> meetings.id
name           varchar
organization   varchar NULL
title          varchar NULL
contact        varchar NULL
notes          text NULL
invited_by_user_id bigint FK -> users.id NULL  -- 谁邀请的
created_at     timestamptz
updated_at     timestamptz
is_deleted     boolean default false
```

---

### 8.4 `meeting_minutes`

```text
meeting_minutes
---------------
meeting_id          bigint PK FK -> meetings.id
content             text                    -- 纪要内容（Markdown/富文本）
attachments         jsonb NULL              -- 附件列表 [{name,url},...]
created_by_user_id  bigint FK -> users.id
created_at          timestamptz
updated_at          timestamptz
```

---

### 8.5 `user_availability`

```text
user_availability
-----------------
id             bigserial PK
user_id        bigint FK -> users.id
start_time     timestamptz
end_time       timestamptz
note           text NULL                    -- 备注，如“只接受线上”

-- 可见范围
visibility_scope_type       varchar not null
visibility_min_role_level   int NULL
visibility_user_ids         jsonb NULL

created_at      timestamptz
updated_at      timestamptz
is_deleted      boolean default false
```

---

## 9. 社群 & 反馈 & 私信

### 9.1 `posts`（社群动态）

```text
posts
-----
id                     bigserial PK
author_user_id         bigint FK -> users.id
post_type              varchar         -- GENERAL / PROJECT / RESOURCE / VOTE / ANNOUNCEMENT_REF
content                text            -- 文本内容（可含链接）
related_project_id     bigint FK -> projects.id NULL
related_resource_id    bigint FK -> resources.id NULL
related_vote_id        bigint FK -> votes.id NULL
related_announcement_id bigint FK -> announcements.id NULL

created_at             timestamptz
updated_at             timestamptz
is_deleted             boolean default false

-- 可见范围
visibility_scope_type       varchar not null
visibility_min_role_level   int NULL
visibility_user_ids         jsonb NULL
```

---

### 9.2 `comments`（评论）

```text
comments
--------
id           bigserial PK
post_id      bigint FK -> posts.id
user_id      bigint FK -> users.id
content      text
mentions     jsonb NULL      -- 被 @ 用户列表，如 [user_id1, user_id2]
created_at   timestamptz
updated_at   timestamptz
is_deleted   boolean default false
```

---

### 9.3 `likes`（点赞）

```text
likes
-----
post_id     bigint FK -> posts.id
user_id     bigint FK -> users.id
created_at  timestamptz

PRIMARY KEY (post_id, user_id)
```

---

### 9.4 `feedbacks`（意见反馈）

```text
feedbacks
---------
id                  bigserial PK
user_id             bigint FK -> users.id      -- 反馈人
category            varchar                    -- PRODUCT / BUG / POLICY / OTHER 等
title               varchar
content             text
contact             varchar NULL               -- 若与用户资料不同，可单独留
allow_contact       boolean default true

status              varchar default 'OPEN'     -- OPEN / RESOLVED / REJECTED 等
admin_reply         text NULL                  -- 管理员处理结果/回复
admin_user_id       bigint FK -> users.id NULL
admin_replied_at    timestamptz NULL

created_at          timestamptz
updated_at          timestamptz
is_deleted          boolean default false
```

---

### 9.5 私信（Direct Messages）

#### 9.5.1 `dm_threads`

```text
dm_threads
----------
id             bigserial PK
user_a_id      bigint FK -> users.id   -- 参与方 A
user_b_id      bigint FK -> users.id   -- 参与方 B
created_at     timestamptz
updated_at     timestamptz
```

> 约定：`(user_a_id, user_b_id)` 组合唯一（可加 unique 约束，强制排序 user_id 小的为 a）。

#### 9.5.2 `dm_messages`

```text
dm_messages
-----------
id             bigserial PK
thread_id      bigint FK -> dm_threads.id
sender_id      bigint FK -> users.id
receiver_id    bigint FK -> users.id
content        text
created_at     timestamptz
is_read        boolean default false
is_deleted     boolean default false   -- 逻辑删除（可按双方视角实现）

-- 可选：附件 / 富文本等，可扩展 jsonb 字段
```

---

## 10. 投票域（Voting）

### 10.1 `votes`

```text
votes
-----
id              bigserial PK
title           varchar             -- 投票标题
reason          text                -- 投票事由（PRD 中“投票事由”）
description     text NULL           -- 补充说明/备注
created_by      bigint FK -> users.id
status          varchar             -- OPEN / CLOSED
end_time        timestamptz         -- 截止时间
is_anonymous    boolean default false
pass_rule       varchar             -- 投票结果标准文案（1/3、1/2、2/3、全票、自定义描述）
allow_abstain   boolean default false -- 是否开设弃票选项

created_at      timestamptz
updated_at      timestamptz
is_deleted      boolean default false

-- 可见范围
visibility_scope_type       varchar not null
visibility_min_role_level   int NULL
visibility_user_ids         jsonb NULL
```

---

### 10.2 `vote_options`

```text
vote_options
------------
id        bigserial PK
vote_id   bigint FK -> votes.id
text      varchar
order_no  int
```

---

### 10.3 `vote_records`

```text
vote_records
------------
vote_id     bigint FK -> votes.id
user_id     bigint FK -> users.id
option_id   bigint FK -> vote_options.id
created_at  timestamptz

PRIMARY KEY (vote_id, user_id)
```

> 只允许单选。若未来支持多选，可调整主键或增加序号字段。

---

## 11. 信箱 & 公告

### 11.1 `announcements`（公告）

```text
announcements
-------------
id                      bigserial PK
title                   varchar       -- 公告名称
content                 text          -- 公告内容
attachments             jsonb NULL    -- 附件列表 [{name,url},...]
created_by_user_id      bigint FK -> users.id
created_at              timestamptz
updated_at              timestamptz
is_deleted              boolean default false

-- 可见范围
visibility_scope_type       varchar not null
visibility_min_role_level   int NULL
visibility_user_ids         jsonb NULL
```

---

### 11.2 `inbox_items`（信箱消息）

```text
inbox_items
-----------
id                    bigserial PK
user_id               bigint FK -> users.id
category              varchar          -- ANNOUNCEMENT / SYSTEM / VOTE / DM / MENTION
title                 varchar
content               text             -- 消息内容摘要/全文
related_object_type   varchar NULL     -- PROJECT / DEMAND / TRANSACTION / VOTE / MEETING / POST / COMMENT / ANNOUNCEMENT / DM_THREAD 等
related_object_id     bigint NULL
is_read               boolean default false
created_at            timestamptz
is_deleted            boolean default false
```

> 信箱用于驱动：公告通知、系统事件（项目/需求/Token/会议）、投票通知、私信、新 @ 消息等。

---

## 12. 平台价值 & 审计

### 12.1 `value_records`（元征创造的价值）

```text
value_records
-------------
id                  bigserial PK
amount              numeric(18,2)        -- 金额
currency            varchar              -- 币种，如 CNY
description         text                 -- 描述（管理员填写）
related_project_id  bigint FK -> projects.id NULL
record_time         timestamptz          -- 计入时间
created_by_admin_id bigint FK -> users.id    -- 录入管理员
created_at          timestamptz
updated_at          timestamptz
```

> 用于仪表盘中的“元征价值曲线”。

---

### 12.2 `audit_logs`（审计日志）

```text
audit_logs
----------
id            bigserial PK
user_id       bigint FK -> users.id        -- 操作人
action        varchar                      -- 操作类型，如 DELETE_RESOURCE / UPDATE_PROJECT_STATUS / ADMIN_GRANT_TOKEN 等
object_type   varchar                      -- 对象类型：PROJECT / RESOURCE / POST / COMMENT / USER / TOKEN_TRANSACTION 等
object_id     bigint                       -- 对象 ID
summary       text                         -- 简要说明（不存原对象全文）
created_at    timestamptz
```

> 用于记录敏感操作（删帖、删资源、管理员调账、公告修改等），满足“所有重要操作可追踪”的要求。

---

## 13. 其他可选/扩展表

> 以下内容 PRD 中未强制要求，但在实现中通常需要，可视情况选用：

### 13.1 登录验证码（可选）

```text
login_verification_codes
------------------------
id            bigserial PK
channel       varchar        -- PHONE / EMAIL
account       varchar        -- 手机号或邮箱
code          varchar
purpose       varchar        -- LOGIN / RESET_PASSWORD
expires_at    timestamptz
used          boolean default false
created_at    timestamptz
```

---

## 14. 索引建议（概要）

* 常用过滤字段建议加索引，例如：

  * `projects (business_status, review_status)`
  * `token_transactions (created_by_user_id, created_at)`
  * `demands (project_id, status)`
  * `demand_responses (demand_id, status)`
  * `project_events (project_id, created_at)`
  * `resources (owner_user_id, is_deleted)`
  * `news (publish_time)`
  * `meetings (start_time)`
  * `posts (created_at, post_type)`
  * `votes (status, end_time)`
  * `inbox_items (user_id, is_read, created_at)`

---

> 以上即为 **元征 · 合伙人赋能平台 Schema V2 完整版**。
> 它与 PRD v2 逐项对应，并对多项目需求分组、响应修改/废弃、外部嘉宾邀请人、DM 会话、公告/信箱等做了明确落库设计。
