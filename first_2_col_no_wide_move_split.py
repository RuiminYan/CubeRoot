# 每个分割csv包含 10000 行数据
# 文件名自动设定为 part_xxx.csv

import pandas as pd
import os
import time
import re
import math
import sys

# ======================================================================
# --- 步骤 0: 全局配置 ---
# ======================================================================

# 自动获取脚本所在目录，用于构建所有文件的绝对路径
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# 初始输入文件 (多列 CSV)
INPUT_CSV_FILE = 'wca_scrambles_info.csv'

# 中间文件 1: 提取前两列后的 TXT 文件 (第一步的输出，第二步的输入)
# 对应原始脚本 1 的 output_file
INTERMEDIATE_FILE_1 = 'wca_scrambles.txt'

# 中间文件 2: 转换 wide move 后的 TXT 文件 (第二步的输出，第三步的输入)
# 对应原始脚本 2 的 output_file
INTERMEDIATE_FILE_2 = 'wca_scrambles_no_wide_move.txt'

# 第三步的分割设置
LINES_PER_SPLIT_FILE = 10000 
OUTPUT_SPLIT_PREFIX = "part"


# ======================================================================
# --- 步骤 1: CSV 提取前两列并保存为 TXT (基于 ExtractFirstTwoCols_To_DelimitedTXT.py) ---
# ======================================================================

def step1_extract_and_format(input_csv_path, output_txt_path):
    """从 CSV 中提取前两列，并保存为逗号分隔的 TXT 文件（无表头/索引）。"""
    print("--- 步骤 1: 提取前两列并格式化 ---")
    
    if not os.path.exists(input_csv_path):
        print(f"❌ 错误：找不到文件 '{input_csv_path}'。请检查路径和文件名。")
        return False
    
    try:
        # 读取 CSV 文件
        df = pd.read_csv(input_csv_path, header=0)
        
        # 只选择前两列 (索引 0 和 1)
        df_selected = df.iloc[:, :2]
        
        # 将结果保存到 TXT 文件，使用逗号分隔，无表头和索引
        df_selected.to_csv(
            output_txt_path,
            sep=',',
            header=False,
            index=False,
            encoding='utf-8'
        )
        print(f"✅ 步骤 1 完成：已将前两列保存到 '{os.path.basename(output_txt_path)}'。")
        return True
    
    except pd.errors.EmptyDataError:
        print(f"❌ 错误：文件 '{input_csv_path}' 是空的。")
        return False
    except Exception as e:
        print(f"❌ 步骤 1 发生错误: {e}")
        return False


# ======================================================================
# --- 步骤 2: 转换 Wide Move (基于 No_Wide_Move.py) ---
# ======================================================================

# 原始脚本中的 fix_scramble 函数
def fix_scramble(scramble):
    """将包含宽层转动的打乱公式转换为仅包含单层转动的公式。"""
    p = [0, 1, 2, 3, 4, 5]
    faces = "UFRDBL"
    face_map = {c: i for i, c in enumerate(faces)}
    perms = {
        'x': [1, 3, 2, 4, 0, 5],
        'y': [0, 2, 4, 3, 5, 1],
        'z': [5, 1, 0, 2, 4, 3]
    }
    result = []
    moves = re.findall(r'[RULDFB][w]?(?:2|\')?', scramble.strip())

    for m in moves:
        if not m:
            continue
        base = m[0]
        suffix = m[1:] if len(m) > 1 else ""
        k = 2 if '2' in suffix else (3 if "'" in suffix else 1)

        if 'w' in m:
            phys_idx = face_map[base]
            opp_face_char = faces[p[(phys_idx + 3) % 6]]
            result.append(opp_face_char + suffix.replace('w', ''))

            axis = {'R': 'x', 'L': 'x', 'U': 'y', 'D': 'y', 'F': 'z', 'B': 'z'}[base]
            rot_dir = 1 if base in "RUF" else 3
            for _ in range((k * rot_dir) % 4):
                p = [p[i] for i in perms[axis]]
        else:
            if base in face_map:
                phys_idx = face_map[base]
                result.append(faces[p[phys_idx]] + suffix)

    return " ".join(result)

def step2_convert_wide_moves(input_file_path, output_file_path):
    """批量处理文件，转换打乱公式中的宽层转动。"""
    print("\n--- 步骤 2: 转换 Wide Move (w) ---")
    
    try:
        with open(input_file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        lines = [line.strip() for line in lines if line.strip()]
        
        print(f"开始处理 {len(lines)} 条打乱...")
        start_time = time.time()

        fixed_lines = []
        for line in lines:
            # 查找第一个空格后的所有内容作为打乱序列
            parts = line.split(',', 1) # 注意：这里使用 ',' 分隔符，因为它来自步骤 1 的输出

            if len(parts) == 2:
                index = parts[0]
                scramble = parts[1]
                fixed_scramble = fix_scramble(scramble)
                # 重新组合：编号 + 原始分隔符 + 处理后的打乱
                fixed_lines.append(f"{index},{fixed_scramble}")
            else:
                # 兼容旧格式或只有打乱没有编号的情况
                 fixed_lines.append(fix_scramble(line))


        with open(output_file_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(fixed_lines))

        print(f"✅ 步骤 2 完成：已保存至 '{os.path.basename(output_file_path)}'。")
        print(f"耗时: {time.time() - start_time:.4f} 秒")
        return True

    except FileNotFoundError:
        print(f"❌ 错误：找不到输入文件 '{os.path.basename(input_file_path)}' (步骤 1 的输出)。")
        return False
    except Exception as e:
        print(f"❌ 步骤 2 发生错误: {e}")
        return False


# ======================================================================
# --- 步骤 3: 按行数分割文件 (基于 Splitter_ByLineCount.py) ---
# ======================================================================

def step3_split_file(input_file_path, lines_per_file, base_dir, prefix):
    """将文件按固定行数分割成带零填充序号的小文件。"""
    print("\n--- 步骤 3: 按行数分割文件 ---")
    
    if not os.path.exists(input_file_path):
        print(f"❌ 错误：找不到输入文件 '{os.path.basename(input_file_path)}' (步骤 2 的输出)。")
        return False
        
    try:
        # 统计总行数（用于计算零填充位数）
        with open(input_file_path, "r", encoding="utf-8") as f:
            total_lines = sum(1 for _ in f)

        if total_lines == 0:
            print("警告: 文件内容为空，无需分割。")
            return True

        total_files = math.ceil(total_lines / lines_per_file)
        digits = len(str(total_files))  # 自动决定零填充位数
        
        print(f"总行数: {total_lines}，将分割成 {total_files} 个文件。")

        # 正式拆分
        with open(input_file_path, "r", encoding="utf-8") as f:
            file_count = 1
            # 初始化第一个输出文件
            filename = f"{prefix}_{str(file_count).zfill(digits)}.txt"
            output_path = os.path.join(base_dir, filename)
            out = open(output_path, "w", encoding="utf-8")

            for i, line in enumerate(f, start=1):
                out.write(line)

                if i % lines_per_file == 0:
                    out.close()
                    file_count += 1
                    if file_count <= total_files:
                        filename = f"{prefix}_{str(file_count).zfill(digits)}.txt"
                        output_path = os.path.join(base_dir, filename)
                        out = open(output_path, "w", encoding="utf-8")

            # 关闭最后一个文件
            out.close()

        print("🎉 步骤 3 完成！所有输出文件已生成在脚本同目录。")
        return True
        
    except Exception as e:
        print(f"❌ 步骤 3 发生错误: {e}")
        return False

# ======================================================================
# --- 主程序流程 ---
# ======================================================================

if __name__ == '__main__':
    
    print("=" * 40)
    print("WCA 打乱公式自动化处理流程启动")
    print("=" * 40)
    
    input_csv_path = os.path.join(SCRIPT_DIR, INPUT_CSV_FILE)
    intermediate_txt_1_path = os.path.join(SCRIPT_DIR, INTERMEDIATE_FILE_1)
    intermediate_txt_2_path = os.path.join(SCRIPT_DIR, INTERMEDIATE_FILE_2)
    
    success = True
    
    # 流程 1: 提取和格式化
    if success:
        success = step1_extract_and_format(input_csv_path, intermediate_txt_1_path)
    
    # 流程 2: 转换 Wide Move
    if success:
        success = step2_convert_wide_moves(intermediate_txt_1_path, intermediate_txt_2_path)
        
    # 流程 3: 分割文件
    if success:
        success = step3_split_file(intermediate_txt_2_path, LINES_PER_SPLIT_FILE, SCRIPT_DIR, OUTPUT_SPLIT_PREFIX)
    
    print("\n" + "=" * 40)
    if success:
        print("🎉 所有步骤成功完成！")
        # 清理中间文件（可选）
        # os.remove(intermediate_txt_1_path)
        # os.remove(intermediate_txt_2_path)
        # print("（已清理中间文件）")
    else:
        print("❌ 流程中断或失败。请查看上面的错误信息。")
    print("=" * 40)
    
    # 保持窗口打开直到用户按回车（从原始脚本 3 借鉴）
    if sys.stdin.isatty():
        input("按回车退出...")