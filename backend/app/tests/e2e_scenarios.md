# 元征 · 合伙人赋能平台 - E2E 测试场景文档

本文档定义了端到端测试场景，用于验证系统各功能模块的完整性。

---

## 场景 1: 典型项目闭环

### 场景描述
联合创始人发起项目 → 管理员审核 → 发布需求 → 核心/普通响应 → 被接受 → 资源使用 → Token 结算 → 记录结案价值

### 测试步骤

#### Step 1: 联合创始人发起项目
- **操作者**: 联合创始人 (role_level=3)
- **操作**: POST `/api/v1/projects`
- **请求体**:
  ```json
  {
    "name": "测试项目A",
    "description": "这是一个测试项目",
    "background": "项目背景描述",
    "objectives": "项目目标",
    "expected_outcomes": "预期成果",
    "initial_share_percent": 20,
    "visibility_all": false,
    "visibility_founding": true,
    "visibility_core": true,
    "visibility_normal": true
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 项目创建成功
  - `review_status` = "PENDING_REVIEW"
  - `business_status` = "INITIALIZING"
  - 创建项目事件: PROJECT_CREATED
  - 创建审计日志: PROJECT_CREATE

#### Step 2: 管理员审核项目
- **操作者**: 管理员 (is_admin=true)
- **操作**: POST `/api/v1/admin/projects/{project_id}/review`
- **请求体**:
  ```json
  {
    "action": "approve",
    "comment": "审核通过"
  }
  ```
- **期望结果**:
  - 状态码: 200
  - `review_status` = "APPROVED"
  - `business_status` = "ONGOING"
  - 创建项目事件: PROJECT_APPROVED
  - 创建审计日志: PROJECT_APPROVE

#### Step 3: 项目负责人发布需求
- **操作者**: 项目负责人 (项目成员, project_role=OWNER)
- **操作**: POST `/api/v1/projects/{project_id}/demands`
- **请求体**:
  ```json
  {
    "title": "寻求法律资源支持",
    "description": "需要法律方面的资源协助",
    "type": "RESOURCE",
    "urgency": 3,
    "expected_resource_type": "法律服务",
    "suggested_reward_min": 100,
    "suggested_reward_max": 500,
    "visibility_founding": true,
    "visibility_core": true,
    "visibility_normal": true
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 需求创建成功
  - `status` = "OPEN"
  - 创建项目事件: DEMAND_PUBLISHED

#### Step 4: 核心合伙人响应需求
- **操作者**: 核心合伙人 (role_level=2)
- **操作**: POST `/api/v1/demands/{demand_id}/responses`
- **请求体**:
  ```json
  {
    "resource_id": 1,
    "description": "我可以提供法律顾问服务",
    "expected_reward": 200
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 响应创建成功
  - `status` = "PENDING_REVIEW"
  - 创建项目事件: DEMAND_RESPONDED

#### Step 5: 需求负责人接受响应
- **操作者**: 需求发布者/项目负责人
- **操作**: POST `/api/v1/demands/responses/{response_id}/review`
- **请求体**:
  ```json
  {
    "action": "accept",
    "final_reward": 200,
    "comment": "感谢您的支持"
  }
  ```
- **期望结果**:
  - 状态码: 200
  - `status` = "ACCEPTED_PENDING_USAGE"
  - 创建项目事件: DEMAND_ACCEPTED

#### Step 6: 确认资源已使用
- **操作者**: 项目负责人
- **操作**: POST `/api/v1/demands/responses/{response_id}/mark-used`
- **请求体**:
  ```json
  {
    "usage_note": "法律文件审核完成"
  }
  ```
- **期望结果**:
  - 状态码: 200
  - `status` = "USED"
  - 返回建议 Token 交易信息
  - 创建项目事件: RESOURCE_MARKED_USED

#### Step 7: Token 转账结算
- **操作者**: 项目负责人
- **操作**: POST `/api/v1/token/transactions`
- **请求体**:
  ```json
  {
    "to_user_id": <响应者ID>,
    "amount": 200,
    "related_project_id": <项目ID>,
    "related_demand_response_id": <响应ID>,
    "note": "感谢提供法律资源"
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 交易创建成功
  - `status` = "PENDING_ADMIN_APPROVAL"

#### Step 8: 管理员审批 Token 转账
- **操作者**: 管理员
- **操作**: POST `/api/v1/admin/token/transactions/{tx_id}/approve`
- **期望结果**:
  - 状态码: 200
  - `status` = "PENDING_RECEIVER_CONFIRMATION"
  - 创建审计日志: TOKEN_TRANSFER_APPROVE

#### Step 9: 收款方确认
- **操作者**: 响应者（收款方）
- **操作**: POST `/api/v1/token/transactions/{tx_id}/confirm`
- **期望结果**:
  - 状态码: 200
  - `status` = "COMPLETED"
  - 发起方余额减少 200
  - 收款方余额增加 200
  - 创建项目事件: TOKEN_TRANSFER_COMPLETED

#### Step 10: 管理员记录项目价值
- **操作者**: 管理员
- **操作**: POST `/api/v1/admin/value-records`
- **请求体**:
  ```json
  {
    "amount": 50000,
    "currency": "CNY",
    "description": "项目法律服务估值",
    "related_project_id": <项目ID>,
    "record_time": "2024-12-14T10:00:00Z"
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 价值记录创建成功
  - 创建项目事件: PROJECT_VALUE_RECORDED
  - 创建审计日志: VALUE_RECORD_CREATE

---

## 场景 2: 响应修改/废弃场景

### 场景描述
响应被接受但未使用 → 负责人发起废弃 → 资源方拒绝 → 管理员裁决

### 测试步骤

#### Step 1: 创建并接受响应
- 复用场景1的 Step 1-5

#### Step 2: 项目负责人发起废弃请求
- **操作者**: 项目负责人
- **操作**: POST `/api/v1/demands/responses/{response_id}/change-requests`
- **请求体**:
  ```json
  {
    "type": "ABANDON",
    "reason": "项目方向调整，不再需要此资源"
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 变更请求创建成功
  - `status` = "PENDING_RESOURCE_OWNER"

#### Step 3: 资源方拒绝废弃
- **操作者**: 响应者（资源方）
- **操作**: POST `/api/v1/demands/change-requests/{request_id}/review`
- **请求体**:
  ```json
  {
    "action": "reject",
    "reason": "我已经投入了准备工作"
  }
  ```
- **期望结果**:
  - 状态码: 200
  - `status` = "PENDING_ADMIN"
  - 通知管理员需要裁决

#### Step 4: 管理员裁决
- **操作者**: 管理员
- **操作**: POST `/api/v1/admin/demands/change-requests/{request_id}/decide`
- **请求体**:
  ```json
  {
    "decision": "APPROVE",
    "reason": "经核实，项目确实已调整方向"
  }
  ```
- **期望结果**:
  - 状态码: 200
  - 变更请求 `status` = "APPROVED"
  - 响应 `status` = "ABANDONED"
  - 创建审计日志: CHANGE_REQUEST_ADMIN_APPROVE

---

## 场景 3: 座谈会 & 外部嘉宾贡献

### 场景描述
合伙人维护可用时间 → 管理员选定座谈会 → 会后记录外部嘉宾与邀请人 → 仪表盘"我的贡献"中可看到邀请记录

### 测试步骤

#### Step 1: 合伙人设置可用时间
- **操作者**: 任意合伙人
- **操作**: POST `/api/v1/users/me/availability`
- **请求体**:
  ```json
  {
    "date": "2024-12-21",
    "time_slot": "14:00-16:00",
    "is_available": true
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 可用时间记录成功

#### Step 2: 管理员创建座谈会
- **操作者**: 管理员
- **操作**: POST `/api/v1/meetings`
- **请求体**:
  ```json
  {
    "title": "2024年第12期周常座谈会",
    "description": "年度总结讨论",
    "scheduled_time": "2024-12-21T14:00:00Z",
    "duration_minutes": 120,
    "location": "线上",
    "related_project_id": null
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 座谈会创建成功

#### Step 3: 合伙人邀请外部嘉宾
- **操作者**: 合伙人
- **操作**: POST `/api/v1/meetings/{meeting_id}/guests`
- **请求体**:
  ```json
  {
    "name": "张三",
    "organization": "某律师事务所",
    "title": "高级合伙人",
    "contact_info": "zhangsan@law.com",
    "reason": "法律专业分享"
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 外部嘉宾记录成功
  - `invited_by_user_id` = 当前用户ID

#### Step 4: 会后提交会议纪要
- **操作者**: 管理员
- **操作**: POST `/api/v1/meetings/{meeting_id}/minutes`
- **请求体**:
  ```json
  {
    "content": "会议纪要内容...",
    "action_items": ["跟进法律事宜", "下次会议安排"]
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 会议纪要创建成功
  - 座谈会状态更新为 COMPLETED

#### Step 5: 验证仪表盘贡献记录
- **操作者**: 邀请嘉宾的合伙人
- **操作**: GET `/api/v1/users/me/contributions`
- **期望结果**:
  - 状态码: 200
  - 返回中包含"邀请外部嘉宾"记录
  - 显示嘉宾姓名和座谈会信息

---

## 场景 4: 投票 & 公告 & 信箱通知

### 场景描述
管理员发公告 → 所有人信箱收到 ANNOUNCEMENT；
管理员发起投票 → 可见范围内的合伙人信箱收到 VOTE；
有人在动态里 @ 某人 → 被 @ 人信箱收到 MENTION。

### 测试步骤

#### Step 1: 管理员发布公告
- **操作者**: 管理员
- **操作**: POST `/api/v1/admin/announcements`
- **请求体**:
  ```json
  {
    "title": "2024年终总结公告",
    "content": "公告内容...",
    "visibility_founding": true,
    "visibility_core": true,
    "visibility_normal": true,
    "is_pinned": true
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 公告创建成功
  - 所有可见用户收到 ANNOUNCEMENT 类型信箱消息

#### Step 2: 验证用户信箱
- **操作者**: 任意合伙人
- **操作**: GET `/api/v1/notifications`
- **期望结果**:
  - 状态码: 200
  - 返回中包含新公告通知
  - `category` = "ANNOUNCEMENT"

#### Step 3: 管理员发起投票
- **操作者**: 管理员
- **操作**: POST `/api/v1/votes`
- **请求体**:
  ```json
  {
    "title": "2025年发展方向投票",
    "description": "请选择您支持的发展方向",
    "options": [
      {"text": "方向A：深耕现有业务"},
      {"text": "方向B：拓展新领域"},
      {"text": "方向C：兼顾发展"}
    ],
    "deadline": "2024-12-31T23:59:59Z",
    "visibility_founding": true,
    "visibility_core": true,
    "visibility_normal": false,
    "pass_rule": "核心及以上多数通过"
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 投票创建成功
  - 联合创始人和核心合伙人收到 VOTE 类型信箱消息
  - 普通合伙人不收到通知

#### Step 4: 用户发动态并 @ 他人
- **操作者**: 任意合伙人
- **操作**: POST `/api/v1/community/posts`
- **请求体**:
  ```json
  {
    "content": "感谢 @张三 在项目中的大力支持！",
    "mentioned_user_ids": [<张三的用户ID>]
  }
  ```
- **期望结果**:
  - 状态码: 201
  - 动态创建成功
  - 张三收到 MENTION 类型信箱消息

#### Step 5: 验证被 @ 用户信箱
- **操作者**: 张三
- **操作**: GET `/api/v1/notifications`
- **期望结果**:
  - 状态码: 200
  - 返回中包含 @ 提及通知
  - `category` = "MENTION"
  - `related_object_type` = "POST"

---

## 权限验证测试

### 测试 1: 普通合伙人不能发起项目
- **操作者**: 普通合伙人 (role_level=1)
- **操作**: POST `/api/v1/projects`
- **期望结果**:
  - 状态码: 403
  - 错误信息: "需要联合创始人或管理员权限"

### 测试 2: 低层级用户不能将高层级排除在可见范围之外
- **操作者**: 核心合伙人 (role_level=2)
- **操作**: POST `/api/v1/resources` with `visibility_founding=false`
- **期望结果**:
  - 状态码: 400
  - 错误信息: "不能将更高层级用户排除在可见范围之外"

### 测试 3: 非项目成员不能查看私有项目
- **操作者**: 非项目成员的普通合伙人
- **操作**: GET `/api/v1/projects/{private_project_id}`
- **期望结果**:
  - 状态码: 403
  - 错误信息: "您没有权限访问此项目"

### 测试 4: 非管理员不能审批 Token 交易
- **操作者**: 普通用户
- **操作**: POST `/api/v1/admin/token/transactions/{tx_id}/approve`
- **期望结果**:
  - 状态码: 403
  - 错误信息: "需要管理员权限"

### 测试 5: 非资源所有者不能删除资源
- **操作者**: 非资源所有者
- **操作**: DELETE `/api/v1/resources/{resource_id}`
- **期望结果**:
  - 状态码: 403
  - 错误信息: "此操作需要资源所有者权限"

---

## 审计日志验证

以下操作必须记录审计日志：

| 操作 | action | object_type |
|------|--------|-------------|
| 删除资源 | RESOURCE_DELETE | RESOURCE |
| 删除动态 | POST_DELETE | POST |
| 删除评论 | COMMENT_DELETE | COMMENT |
| 删除公告 | ANNOUNCEMENT_DELETE | ANNOUNCEMENT |
| 管理员发放 Token | TOKEN_GRANT | TOKEN_ACCOUNT |
| 管理员扣除 Token | TOKEN_DEDUCT | TOKEN_ACCOUNT |
| 项目状态变更 | PROJECT_* | PROJECT |
| 股权结构调整 | SHARE_ADJUST | PROJECT_SHARE |
| 管理员裁决变更请求 | CHANGE_REQUEST_ADMIN_* | CHANGE_REQUEST |
| 创建价值记录 | VALUE_RECORD_CREATE | VALUE_RECORD |

验证方法：
```bash
# 执行上述操作后，查询审计日志
GET /api/v1/admin/audit-logs?action=RESOURCE_DELETE

# 期望：返回对应的审计日志记录
```

---

## 自动化测试脚本模板

```python
# tests/e2e/test_project_lifecycle.py

import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_project_lifecycle(client: AsyncClient, founding_user_token: str, admin_token: str):
    """测试项目完整生命周期"""
    
    # Step 1: 创建项目
    response = await client.post(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {founding_user_token}"},
        json={
            "name": "测试项目",
            "description": "描述",
            "background": "背景",
            "objectives": "目标",
            "expected_outcomes": "成果"
        }
    )
    assert response.status_code == 201
    project_id = response.json()["id"]
    assert response.json()["review_status"] == "PENDING_REVIEW"
    
    # Step 2: 管理员审核
    response = await client.post(
        f"/api/v1/admin/projects/{project_id}/review",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"action": "approve", "comment": "通过"}
    )
    assert response.status_code == 200
    assert response.json()["review_status"] == "APPROVED"
    
    # ... 继续其他步骤
```

---

## 附录: 测试数据准备

### 用户账号
| 邮箱 | 密码 | 角色 | is_admin |
|------|------|------|----------|
| admin@example.com | admin123 | 管理员 | true |
| cofounder@example.com | cofounder123 | 联合创始人 | true |
| core@example.com | core123 | 核心合伙人 | false |
| partner@example.com | partner123 | 普通合伙人 | false |

### 初始化命令
```bash
cd backend
source venv/bin/activate
python -m app.db.init_data
```

