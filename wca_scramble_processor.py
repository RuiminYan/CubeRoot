# 每个分割csv包含 10000 行数据
# 文件名自动设定为 part_xxx.csv

import pandas as pd
import os
import time
import re
import math
import sys
from contextlib import contextmanager

# ======================================================================
## 🚀 0. 全局配置 & 计时器
# ======================================================================

# 定义输入和输出文件名
INPUT_CSV_FILE = 'wca_scrambles_info.csv'
INTERMEDIATE_FILE_1 = 'wca_scrambles_split_mbf.csv'
INTERMEDIATE_FILE_2 = 'wca_scrambles_cols.txt'
INTERMEDIATE_FILE_3 = 'wca_scrambles_no_wide_move.txt'

# 最终文件分割设置
LINES_PER_SPLIT_FILE = 10000
OUTPUT_SPLIT_PREFIX = "part"

# 自动获取脚本所在目录，用于构建所有文件的绝对路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

@contextmanager
def step_timer(step_name):
    """一个简单的计时上下文管理器，用于打印步骤耗时。"""
    start_time = time.time()
    try:
        yield
    finally:
        end_time = time.time()
        print(f"⌛ 步骤耗时 ({step_name}): {end_time - start_time:.4f} 秒")


# ======================================================================
## 🔢 步骤 1: 拆分多盲打乱 (修复乱序问题)
# ======================================================================

def step1_process_mbf_scrambles(input_file_path, output_file_path):
    """
    使用 Pandas 矢量化操作优化拆分，并引入二级排序键以确保严格顺序。
    """
    print("--- 步骤 1: 拆分多盲打乱公式 (修复乱序版) ---")
    
    if not os.path.exists(input_file_path):
        print(f"❌ 错误：找不到输入文件 '{input_file_path}'。请检查路径。")
        return False

    try:
        with step_timer("步骤 1"):
            # 1. 读取数据
            df = pd.read_csv(input_file_path, engine='python', dtype={'scrambleId': str})
            
            # 再次强制转换
            df['scrambleId'] = df['scrambleId'].astype(str)
            df['scramble'] = df['scramble'].astype(str)
            
            total_rows = len(df)
            
            # 为原始数据添加 original_index，用于后续恢复大顺序
            df['original_index'] = df.index
            
            # 分离数据
            mbf_df = df[df['eventId'] == '333mbf'].copy()
            other_df = df[df['eventId'] != '333mbf'].copy()
            
            mbf_count = len(mbf_df)
            print(f"   共加载 {total_rows} 条记录，其中 {mbf_count} 条为 '333mbf' 多盲记录。")
            
            if mbf_count == 0:
                print("   警告：未发现 '333mbf' 记录，将直接复制文件。")
                df.to_csv(output_file_path, index=False, encoding='utf-8')
                return True

            # --- 处理非多盲数据 ---
            # 非多盲数据的子序号设为 0
            other_df['sub_index'] = 0

            # --- 处理多盲数据 ---
            # a. 拆分字符串
            mbf_df['scramble_list'] = mbf_df['scramble'].str.strip().str.split('\n')
            
            # b. Explode
            df_expanded = mbf_df.explode('scramble_list')
            
            # c. 删除旧列并重命名
            df_expanded = df_expanded.drop(columns=['scramble'])
            df_expanded = df_expanded.rename(columns={'scramble_list': 'scramble'})
            
            # d. 生成子序号 (sub_index)
            # 使用 cumcount() 生成 0, 1, 2... 然后 +1 变成 1, 2, 3...
            df_expanded['sub_index'] = df_expanded.groupby('original_index').cumcount() + 1
            
            # e. 清理数据
            df_expanded['scramble'] = df_expanded['scramble'].str.strip()
            
            # f. 构造新 ID
            df_expanded['scrambleId'] = df_expanded['scrambleId'].astype(str) + '_' + df_expanded['sub_index'].astype(str).str.zfill(3)

            # --- 合并与排序 (关键修复) ---
            df_final = pd.concat([other_df, df_expanded], ignore_index=True)
            
            # 使用两个键进行排序：
            # 1. original_index: 保证记录在文件中的原始位置
            # 2. sub_index: 保证拆分后的子记录按顺序排列
            df_final = df_final.sort_values(by=['original_index', 'sub_index'], ascending=[True, True])
            
            # 重置索引
            df_final = df_final.reset_index(drop=True)

            # --- 清理辅助列 ---
            df_final = df_final.drop(columns=['original_index', 'sub_index'], errors='ignore')
            
            df_final.to_csv(output_file_path, index=False, encoding='utf-8')
            
            print(f"✅ 步骤 1 完成：已拆分成 {len(df_final)} 条记录，保存至 '{os.path.basename(output_file_path)}'。")
        return True

    except Exception as e:
        print(f"❌ 步骤 1 发生错误: {e}")
        import traceback
        traceback.print_exc()
        return False


# ======================================================================
# --- 步骤 2: CSV 提取前两列并保存为 TXT ---
# ======================================================================

def step2_extract_and_format(input_csv_path, output_txt_path):
    print("\n--- 步骤 2: 提取前两列并格式化 ---")
    if not os.path.exists(input_csv_path): 
        print(f"❌ 错误：找不到文件 '{input_csv_path}'。")
        return False
    try:
        with step_timer("步骤 2"):
            df = pd.read_csv(input_csv_path, header=0, dtype={'scrambleId': str})
            df.iloc[:, :2].to_csv(output_txt_path, sep=',', header=False, index=False, encoding='utf-8')
            print(f"✅ 步骤 2 完成：已保存到 '{os.path.basename(output_txt_path)}'。")
        return True
    except Exception as e:
        print(f"❌ 步骤 2 发生错误: {e}")
        return False

# ======================================================================
# --- 步骤 3: 转换 Wide Move (w) ---
# ======================================================================

def fix_scramble(scramble):
    p = [0, 1, 2, 3, 4, 5]
    faces = "UFRDBL"
    face_map = {c: i for i, c in enumerate(faces)}
    perms = {'x': [1, 3, 2, 4, 0, 5], 'y': [0, 2, 4, 3, 5, 1], 'z': [5, 1, 0, 2, 4, 3]}
    result = []
    moves = re.findall(r'[RULDFB][w]?(?:2|\')?', scramble.strip())

    for m in moves:
        if not m: continue
        base = m[0]
        suffix = m[1:] if len(m) > 1 else ""
        k = 2 if '2' in suffix else (3 if "'" in suffix else 1)

        if 'w' in m:
            phys_idx = face_map[base]
            opp_face_char = faces[p[(phys_idx + 3) % 6]]
            result.append(opp_face_char + suffix.replace('w', ''))
            axis = {'R': 'x', 'L': 'x', 'U': 'y', 'D': 'y', 'F': 'z', 'B': 'z'}[base]
            rot_dir = 1 if base in "RUF" else 3
            for _ in range((k * rot_dir) % 4): p = [p[i] for i in perms[axis]]
        else:
            if base in face_map:
                phys_idx = face_map[base]
                result.append(faces[p[phys_idx]] + suffix)
    return " ".join(result)

def step3_convert_wide_moves(input_file_path, output_file_path):
    print("\n--- 步骤 3: 转换 Wide Move (w) ---")
    try:
        with step_timer("步骤 3"):
            with open(input_file_path, 'r', encoding='utf-8') as f:
                lines = [line.strip() for line in f if line.strip()]
            
            print(f"开始处理 {len(lines)} 条打乱...")
            fixed_lines = []
            for line in lines:
                parts = line.split(',', 1)
                if len(parts) == 2:
                    fixed_lines.append(f"{parts[0]},{fix_scramble(parts[1])}")
                else:
                    fixed_lines.append(fix_scramble(line))

            with open(output_file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(fixed_lines))
            print(f"✅ 步骤 3 完成：已保存至 '{os.path.basename(output_file_path)}'。")
        return True
    except Exception as e:
        print(f"❌ 步骤 3 发生错误: {e}")
        return False

# ======================================================================
# --- 步骤 4: 按行数分割文件 (已更新为 .txt 输出) ---
# ======================================================================

def step4_split_file(input_file_path, lines_per_file, base_dir, prefix):
    """将文件按固定行数分割成带零填充序号的小文件，输出为 .txt 格式。"""
    print("\n--- 步骤 4: 按行数分割文件 (输出 .txt) ---")
    if not os.path.exists(input_file_path): 
        print(f"❌ 错误：找不到输入文件 '{os.path.basename(input_file_path)}'。")
        return False
    try:
        with step_timer("步骤 4"):
            with open(input_file_path, "r", encoding="utf-8") as f:
                total_lines = sum(1 for _ in f)
            if total_lines == 0: 
                print("警告: 文件内容为空，无需分割。")
                return True

            total_files = math.ceil(total_lines / lines_per_file)
            digits = len(str(total_files))
            print(f"总行数: {total_lines}，将分割成 {total_files} 个文件。")

            with open(input_file_path, "r", encoding="utf-8") as f:
                file_count = 1
                # --- 修改点 1：使用 .txt 后缀 ---
                filename = f"{prefix}_{str(file_count).zfill(digits)}.txt"
                out = open(os.path.join(base_dir, filename), "w", encoding="utf-8")

                for i, line in enumerate(f, start=1):
                    out.write(line)
                    if i % lines_per_file == 0:
                        out.close()
                        file_count += 1
                        if file_count <= total_files:
                            # --- 修改点 2：使用 .txt 后缀 ---
                            filename = f"{prefix}_{str(file_count).zfill(digits)}.txt"
                            out = open(os.path.join(base_dir, filename), "w", encoding="utf-8")
                out.close()
            print("🎉 步骤 4 完成！所有分块文件已生成。")
        return True
    except Exception as e:
        print(f"❌ 步骤 4 发生错误: {e}")
        return False

# ======================================================================
# --- 主程序流程 ---
# ======================================================================

if __name__ == '__main__':
    
    # 记录总开始时间
    process_start_time = time.time() 
    
    print("=" * 40)
    print("WCA 打乱公式自动化处理流程启动")
    print("=" * 40)
    
    input_csv_path = os.path.join(SCRIPT_DIR, INPUT_CSV_FILE)
    intermediate_csv_1_path = os.path.join(SCRIPT_DIR, INTERMEDIATE_FILE_1)
    intermediate_txt_2_path = os.path.join(SCRIPT_DIR, INTERMEDIATE_FILE_2)
    intermediate_txt_3_path = os.path.join(SCRIPT_DIR, INTERMEDIATE_FILE_3)
    
    success = True
    if success: success = step1_process_mbf_scrambles(input_csv_path, intermediate_csv_1_path)
    if success: success = step2_extract_and_format(intermediate_csv_1_path, intermediate_txt_2_path)
    if success: success = step3_convert_wide_moves(intermediate_txt_2_path, intermediate_txt_3_path)
    if success: success = step4_split_file(intermediate_txt_3_path, LINES_PER_SPLIT_FILE, SCRIPT_DIR, OUTPUT_SPLIT_PREFIX)
    
    # 计算总耗时
    process_end_time = time.time()
    total_duration = process_end_time - process_start_time
    
    print("\n" + "=" * 40)
    if success: 
        print("🎉 所有步骤成功完成！")
        print(f"🚀 **总耗时**: {total_duration:.4f} 秒")
    else: 
        print("❌ 流程中断或失败。")
        
    print("=" * 40)
    
    if sys.stdin.isatty(): input("按回车退出...")
