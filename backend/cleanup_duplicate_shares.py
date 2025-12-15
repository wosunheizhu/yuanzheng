"""
清理重复的股权记录
"""
import os
import sys

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def cleanup_duplicate_shares():
    """清理每个项目中重复的股权记录，保留每个 (project_id, owner_type, owner_id) 组合的最新一条"""
    
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    try:
        # 查找所有重复的股权记录
        find_duplicates_sql = """
        WITH duplicates AS (
            SELECT id, project_id, owner_type, owner_id, percentage,
                   ROW_NUMBER() OVER (
                       PARTITION BY project_id, owner_type, owner_id 
                       ORDER BY id DESC
                   ) as rn
            FROM project_shares
        )
        SELECT id, project_id, owner_type, owner_id, percentage
        FROM duplicates
        WHERE rn > 1
        """
        
        result = db.execute(text(find_duplicates_sql))
        duplicates = result.fetchall()
        
        if not duplicates:
            print("没有找到重复的股权记录")
            return
        
        print(f"找到 {len(duplicates)} 条重复的股权记录:")
        for row in duplicates:
            print(f"  ID: {row[0]}, 项目ID: {row[1]}, 类型: {row[2]}, 所有者ID: {row[3]}, 比例: {row[4]}%")
        
        # 删除重复记录（硬删除）
        duplicate_ids = [row[0] for row in duplicates]
        delete_sql = """
        DELETE FROM project_shares 
        WHERE id = ANY(:ids)
        """
        db.execute(text(delete_sql), {"ids": duplicate_ids})
        db.commit()
        
        print(f"\n已删除 {len(duplicate_ids)} 条重复记录")
        
        # 显示清理后的结果
        check_sql = """
        SELECT ps.project_id, p.name as project_name, ps.owner_type, ps.owner_id, ps.percentage
        FROM project_shares ps
        JOIN projects p ON ps.project_id = p.id
        ORDER BY ps.project_id, ps.id
        """
        result = db.execute(text(check_sql))
        remaining = result.fetchall()
        
        print("\n清理后的股权结构:")
        current_project = None
        for row in remaining:
            if current_project != row[0]:
                current_project = row[0]
                print(f"\n项目 {row[0]} ({row[1]}):")
            owner = "元征" if row[2] == "ORG" else f"用户{row[3]}"
            print(f"  - {owner}: {row[4]}%")
            
    except Exception as e:
        db.rollback()
        print(f"错误: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_duplicate_shares()

