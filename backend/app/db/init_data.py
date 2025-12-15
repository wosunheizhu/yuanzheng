"""
元征 · 合伙人赋能平台 - 初始数据
创建角色和初始管理员账号
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.core.config import settings
from app.models.user import User, Role, UserRole
from app.models.token import TokenAccount
from app.models.project import (
    Project, ProjectMember, ProjectShare, ProjectEvent,
    ProjectReviewStatus, ProjectBusinessStatus, ProjectMemberRole,
    ShareOwnerType, ProjectEventType
)


def init_roles(db: Session) -> None:
    """初始化角色数据"""
    roles_data = [
        {"name": "联合创始人", "code": "FOUNDING", "role_level": 3},
        {"name": "核心合伙人", "code": "CORE", "role_level": 2},
        {"name": "普通合伙人", "code": "NORMAL", "role_level": 1},
    ]
    
    for role_data in roles_data:
        existing = db.query(Role).filter(Role.code == role_data["code"]).first()
        if not existing:
            role = Role(
                name=role_data["name"],
                code=role_data["code"],
                role_level=role_data["role_level"],
                is_system=True
            )
            db.add(role)
            print(f"  创建角色: {role_data['name']}")
    
    db.commit()


def init_admin(db: Session) -> None:
    """初始化管理员账号"""
    admin_email = "admin@yuanzheng.com"
    
    existing = db.query(User).filter(User.email == admin_email).first()
    if existing:
        print(f"  管理员账号已存在: {admin_email}")
        return
    
    # 获取联合创始人角色
    founding_role = db.query(Role).filter(Role.code == "FOUNDING").first()
    if not founding_role:
        print("  错误: 联合创始人角色不存在，请先初始化角色")
        return
    
    # 创建管理员用户
    admin = User(
        name="系统管理员",
        email=admin_email,
        hashed_password=get_password_hash("admin123"),
        is_active=True,
        is_admin=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(admin)
    db.flush()
    
    # 分配角色
    user_role = UserRole(user_id=admin.id, role_id=founding_role.id)
    db.add(user_role)
    
    # 创建 Token 账户
    token_account = TokenAccount(
        user_id=admin.id,
        balance=settings.TOKEN_INITIAL_FOUNDING,
        initial_balance=settings.TOKEN_INITIAL_FOUNDING,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(token_account)
    
    db.commit()
    print(f"  创建管理员账号: {admin_email} (密码: admin123)")


def init_cofounder(db: Session) -> None:
    """初始化联合创始人测试账号"""
    cofounder_email = "cofounder@example.com"
    
    existing = db.query(User).filter(User.email == cofounder_email).first()
    if existing:
        # 确保联合创始人有管理员权限
        if not existing.is_admin:
            existing.is_admin = True
            db.commit()
            print(f"  已更新联合创始人为管理员: {cofounder_email}")
        else:
            print(f"  联合创始人账号已存在: {cofounder_email}")
        return
    
    # 获取联合创始人角色
    founding_role = db.query(Role).filter(Role.code == "FOUNDING").first()
    if not founding_role:
        print("  错误: 联合创始人角色不存在，请先初始化角色")
        return
    
    # 创建联合创始人用户（设置为管理员以便测试管理员控制台）
    cofounder = User(
        name="联合创始人",
        email=cofounder_email,
        organization="元征资本",
        hashed_password=get_password_hash("cofounder123"),
        is_active=True,
        is_admin=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(cofounder)
    db.flush()
    
    # 分配角色
    user_role = UserRole(user_id=cofounder.id, role_id=founding_role.id)
    db.add(user_role)
    
    # 创建 Token 账户
    token_account = TokenAccount(
        user_id=cofounder.id,
        balance=settings.TOKEN_INITIAL_FOUNDING,
        initial_balance=settings.TOKEN_INITIAL_FOUNDING,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(token_account)
    
    db.commit()
    print(f"  创建联合创始人账号: {cofounder_email} (密码: cofounder123)")


def init_test_projects(db: Session) -> None:
    """初始化测试项目数据"""
    # 获取联合创始人用户作为项目创建者
    cofounder = db.query(User).filter(User.email == "cofounder@example.com").first()
    if not cofounder:
        print("  错误: 联合创始人账号不存在，请先初始化用户")
        return
    
    # 测试项目数据
    test_projects = [
        {
            "name": "智慧城市基础设施项目",
            "description": "打造新一代智慧城市基础设施，涵盖交通、能源、通信等多个领域的智能化升级改造。",
            "business_type": "产业赋能",
            "industry": "智慧城市",
            "region": "华东地区",
            "business_status": ProjectBusinessStatus.ONGOING,
        },
        {
            "name": "新能源汽车供应链整合",
            "description": "整合新能源汽车上下游供应链资源，优化产业链布局，提升整体竞争力。",
            "business_type": "并购重组",
            "industry": "新能源汽车",
            "region": "华南地区",
            "business_status": ProjectBusinessStatus.ONGOING,
        },
        {
            "name": "跨境电商平台战略投资",
            "description": "战略投资头部跨境电商平台，助力中国品牌出海，拓展国际市场。",
            "business_type": "协议转让",
            "industry": "跨境电商",
            "region": "全国",
            "business_status": ProjectBusinessStatus.ONGOING,
        },
        {
            "name": "医疗健康产业基金",
            "description": "设立专项医疗健康产业基金，投资生物医药、医疗器械、数字健康等细分领域。",
            "business_type": "产业赋能",
            "industry": "医疗健康",
            "region": "北京",
            "business_status": ProjectBusinessStatus.ONGOING,
        },
        {
            "name": "绿色建筑材料创新项目",
            "description": "研发推广新型绿色建筑材料，推动建筑行业低碳转型，助力双碳目标实现。",
            "business_type": "产业赋能",
            "industry": "绿色建筑",
            "region": "长三角",
            "business_status": ProjectBusinessStatus.PAUSED,
        },
        {
            "name": "数字文创IP运营平台",
            "description": "打造数字文创IP孵化与运营平台，连接创作者与市场，推动文化创意产业数字化发展。",
            "business_type": "其他",
            "industry": "数字文创",
            "region": "上海",
            "business_status": ProjectBusinessStatus.COMPLETED,
        },
        {
            "name": "半导体设备国产化项目",
            "description": "推动半导体核心设备国产化替代，攻克关键技术难题，保障产业链供应安全。",
            "business_type": "产业赋能",
            "industry": "半导体",
            "region": "华东地区",
            "business_status": ProjectBusinessStatus.ONGOING,
        },
    ]
    
    created_count = 0
    for project_data in test_projects:
        # 检查项目是否已存在
        existing = db.query(Project).filter(Project.name == project_data["name"]).first()
        if existing:
            print(f"  项目已存在: {project_data['name']}")
            continue
        
        # 创建项目
        project = Project(
            name=project_data["name"],
            description=project_data["description"],
            business_type=project_data["business_type"],
            industry=project_data["industry"],
            region=project_data["region"],
            review_status=ProjectReviewStatus.APPROVED,
            business_status=project_data["business_status"],
            created_by=cofounder.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(project)
        db.flush()
        
        # 添加项目成员（联合创始人作为负责人）
        member = ProjectMember(
            project_id=project.id,
            user_id=cofounder.id,
            role_in_project=ProjectMemberRole.OWNER,
            duty_description="项目总负责人，负责整体规划与推进",
            join_time=datetime.utcnow()
        )
        db.add(member)
        
        # 添加股权结构（元征51%，联合创始人49%），检查是否已存在
        existing_org_share = db.query(ProjectShare).filter(
            ProjectShare.project_id == project.id,
            ProjectShare.owner_type == ShareOwnerType.ORG,
            ProjectShare.owner_id == 0
        ).first()
        
        if not existing_org_share:
            org_share = ProjectShare(
                project_id=project.id,
                owner_type=ShareOwnerType.ORG,
                owner_id=0,  # 元征组织
                percentage=51.0,
                effective_from=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(org_share)
        
        existing_user_share = db.query(ProjectShare).filter(
            ProjectShare.project_id == project.id,
            ProjectShare.owner_type == ShareOwnerType.USER,
            ProjectShare.owner_id == cofounder.id
        ).first()
        
        if not existing_user_share:
            user_share = ProjectShare(
                project_id=project.id,
                owner_type=ShareOwnerType.USER,
                owner_id=cofounder.id,
                percentage=49.0,
                effective_from=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(user_share)
        
        # 添加项目创建事件
        event = ProjectEvent(
            project_id=project.id,
            event_type=ProjectEventType.PROJECT_CREATED,
            title=f"项目「{project.name}」创建成功",
            description=f"项目由联合创始人创建并通过审核",
            created_by_user_id=cofounder.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(event)
        
        created_count += 1
        print(f"  创建项目: {project_data['name']}")
    
    db.commit()
    print(f"  共创建 {created_count} 个测试项目")


def init_test_users(db: Session) -> None:
    """初始化50个测试用户，分属不同级别"""
    import random
    
    # 检查是否已有足够的测试用户
    existing_count = db.query(User).filter(User.email.like("user%@test.com")).count()
    if existing_count >= 50:
        print(f"  测试用户已存在 ({existing_count} 个)")
        return
    
    # 获取角色
    founding_role = db.query(Role).filter(Role.code == "FOUNDING").first()
    core_role = db.query(Role).filter(Role.code == "CORE").first()
    normal_role = db.query(Role).filter(Role.code == "NORMAL").first()
    
    if not all([founding_role, core_role, normal_role]):
        print("  错误: 角色不存在，请先初始化角色")
        return
    
    # 中文姓名库
    surnames = ["张", "王", "李", "刘", "陈", "杨", "黄", "赵", "吴", "周", 
                "徐", "孙", "马", "朱", "胡", "郭", "何", "林", "罗", "高"]
    given_names = ["伟", "芳", "敏", "静", "秀英", "丽", "强", "磊", "洋", "艳",
                   "杰", "娟", "勇", "军", "涛", "明", "超", "秀兰", "霞", "平",
                   "刚", "华", "红", "斌", "鹏", "旭", "辉", "波", "宇", "健"]
    
    # 组织名称
    organizations = [
        "华夏资本", "中金投资", "红杉资本", "IDG资本", "高瓴资本",
        "启明创投", "经纬中国", "软银中国", "深创投", "君联资本",
        "达晨创投", "金沙江创投", "北极光创投", "晨兴资本", "源码资本",
        "元禾控股", "基石资本", "毅达资本", "同创伟业", "中科创星"
    ]
    
    # 用户分配：5联合创始人、15核心合伙人、30普通合伙人
    user_configs = [
        {"count": 5, "role": founding_role, "role_name": "联合创始人", "initial_token": settings.TOKEN_INITIAL_FOUNDING},
        {"count": 15, "role": core_role, "role_name": "核心合伙人", "initial_token": settings.TOKEN_INITIAL_CORE},
        {"count": 30, "role": normal_role, "role_name": "普通合伙人", "initial_token": settings.TOKEN_INITIAL_NORMAL},
    ]
    
    user_index = 1
    created_count = 0
    
    for config in user_configs:
        for i in range(config["count"]):
            email = f"user{user_index:03d}@test.com"
            
            # 检查用户是否已存在
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                user_index += 1
                continue
            
            # 生成姓名
            name = random.choice(surnames) + random.choice(given_names)
            # 避免重复姓名
            if i % 3 == 1:
                name += random.choice(["一", "二", "三", "四", "五"])
            
            # 生成组织
            org = random.choice(organizations)
            
            # 创建用户
            user = User(
                name=name,
                email=email,
                phone=f"138{random.randint(10000000, 99999999)}",
                organization=org,
                hashed_password=get_password_hash("password123"),
                is_active=True,
                is_admin=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(user)
            db.flush()
            
            # 分配角色
            user_role = UserRole(user_id=user.id, role_id=config["role"].id)
            db.add(user_role)
            
            # 创建 Token 账户
            token_account = TokenAccount(
                user_id=user.id,
                balance=config["initial_token"],
                initial_balance=config["initial_token"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(token_account)
            
            created_count += 1
            user_index += 1
            
            if created_count % 10 == 0:
                print(f"    已创建 {created_count} 个用户...")
    
    db.commit()
    print(f"  共创建 {created_count} 个测试用户")
    print(f"    - 联合创始人: 5 个")
    print(f"    - 核心合伙人: 15 个")
    print(f"    - 普通合伙人: 30 个")
    print(f"    默认密码: password123")


def init_announcements(db: Session) -> None:
    """初始化测试公告数据"""
    from app.models.notification import Announcement, InboxItem, InboxCategory
    from app.models.project import VisibilityScopeType
    
    # 获取管理员用户作为公告发布者
    admin = db.query(User).filter(User.email == "admin@yuanzheng.com").first()
    if not admin:
        print("  错误: 管理员账号不存在，请先初始化用户")
        return
    
    # 检查是否已有公告
    existing_count = db.query(Announcement).count()
    if existing_count > 0:
        print(f"  公告已存在 ({existing_count} 条)")
        return
    
    # 测试公告数据
    test_announcements = [
        {
            "title": "🎉 欢迎使用元征合伙人赋能平台",
            "content": """各位合伙人好！

欢迎使用元征 · 合伙人赋能平台。这是一个专为金融行业合伙人打造的协作网络平台。

平台核心功能：
• 项目管理：创建和管理协作项目，跟踪项目进程
• 需求与响应：发布需求，响应合伙人请求
• Token 系统：量化贡献，记录协作价值
• 资源管理：发布和检索合伙人资源
• 座谈会管理：安排会议，记录外部嘉宾
• 社群交流：动态分享、私信、投票等

如有任何问题，请随时联系管理员。

祝工作顺利！
元征管理团队""",
        },
        {
            "title": "📢 平台使用规范公告",
            "content": """各位合伙人：

为确保平台高效、有序运行，现将平台使用规范公告如下：

一、角色权限
• 联合创始人：可发起项目，初始Token 100,000
• 核心合伙人：初始Token 30,000
• 普通合伙人：初始Token 10,000

二、项目管理
• 只有联合创始人可以发起新项目
• 项目发布后需管理员审核通过
• 项目进程将记录在时间线中

三、Token规则
• Token不允许透支
• 所有交易需管理员审核
• 可通过协作贡献获取Token奖励

请各位合伙人遵守平台规范，共同维护良好的协作环境。

元征管理团队""",
        },
        {
            "title": "🚀 新功能上线通知",
            "content": """各位合伙人：

平台近期上线了以下新功能：

1. 项目时间线
   - 所有项目动态自动记录
   - 支持手动添加里程碑和备注
   - 完整的历史追溯

2. 资源AI检索
   - 智能匹配合伙人资源
   - 提供使用建议
   - 支持自然语言查询

3. 信箱系统
   - 公告/系统通知/投票/私信统一管理
   - 未读消息提醒
   - 快捷跳转到相关业务

欢迎体验并反馈意见！

元征管理团队""",
        },
    ]
    
    # 获取所有活跃用户
    all_users = db.query(User).filter(
        User.is_deleted == False,
        User.is_active == True,
        User.id != admin.id
    ).all()
    
    for announcement_data in test_announcements:
        # 创建公告
        announcement = Announcement(
            title=announcement_data["title"],
            content=announcement_data["content"],
            created_by_user_id=admin.id,
            visibility_scope_type=VisibilityScopeType.ALL,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(announcement)
        db.flush()
        
        # 为所有用户创建信箱消息
        for user in all_users:
            inbox_item = InboxItem(
                user_id=user.id,
                category=InboxCategory.ANNOUNCEMENT,
                title=announcement.title,
                content=announcement.content[:200],
                related_object_type="ANNOUNCEMENT",
                related_object_id=announcement.id,
                is_read=False,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(inbox_item)
        
        print(f"  创建公告: {announcement_data['title']}")
    
    db.commit()
    print(f"  共创建 {len(test_announcements)} 条公告")


def init_db(db: Session) -> None:
    """初始化所有数据"""
    print("开始初始化数据...")
    
    print("1. 初始化角色...")
    init_roles(db)
    
    print("2. 初始化管理员账号...")
    init_admin(db)
    
    print("3. 初始化联合创始人测试账号...")
    init_cofounder(db)
    
    print("4. 初始化测试项目...")
    init_test_projects(db)
    
    print("5. 初始化测试用户 (50个)...")
    init_test_users(db)
    
    print("6. 初始化测试公告...")
    init_announcements(db)
    
    print("初始化完成!")


if __name__ == "__main__":
    from app.db.session import SessionLocal
    
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

