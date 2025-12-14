import pandas as pd
import glob
import os
import sys

# --- 配置参数 ---
# 1. append.py 的输出文件名 (上下合并结果)
APPEND_OUTPUT_FILENAME = 'cross.csv'

# 2. concat.py 的输入文件 (主信息文件)
CONCAT_INPUT_DF1 = 'wca_scrambles_info.csv'

# 3. concat.py 的输出文件名 (最终结果)
FINAL_OUTPUT_FILENAME = 'wca_scrambles_info_cross.csv'

# 4. cross.csv 中需要被移除的列名 (在左右拼接前)
COLUMN_TO_DROP_IN_CROSS = 'scrambleId'

# 5. 🆕 cross.csv 的完整表头列表
CROSS_CSV_HEADERS = [
    'scrambleId', 'Y_C', 'Y_BL', 'Y_BR', 'Y_FR', 'Y_FL', 'Y_BL_BR', 'Y_BL_FR', 'Y_BL_FL', 'Y_BR_FR', 'Y_BR_FL', 'Y_FR_FL', 'Y_BL_BR_FR', 'Y_BL_BR_FL', 'Y_BL_FR_FL', 'Y_BR_FR_FL', 
    'W_C', 'W_BL', 'W_BR', 'W_FR', 'W_FL', 'W_BL_BR', 'W_BL_FR', 'W_BL_FL', 'W_BR_FR', 'W_BR_FL', 'W_FR_FL', 'W_BL_BR_FR', 'W_BL_BR_FL', 'W_BL_FR_FL', 'W_BR_FR_FL', 
    'O_C', 'O_BL', 'O_BR', 'O_FR', 'O_FL', 'O_BL_BR', 'O_BL_FR', 'O_BL_FL', 'O_BR_FR', 'O_BR_FL', 'O_FR_FL', 'O_BL_BR_FR', 'O_BL_BR_FL', 'O_BL_FR_FL', 'O_BR_FR_FL', 
    'R_C', 'R_BL', 'R_BR', 'R_FR', 'R_FL', 'R_BL_BR', 'R_BL_FR', 'R_BL_FL', 'R_BR_FR', 'R_BR_FL', 'R_FR_FL', 'R_BL_BR_FR', 'R_BL_BR_FL', 'R_BL_FR_FL', 'R_BR_FR_FL', 
    'G_C', 'G_BL', 'G_BR', 'G_FR', 'G_FL', 'G_BL_BR', 'G_BL_FR', 'G_BL_FL', 'G_BR_FR', 'G_BR_FL', 'G_FR_FL', 'G_BL_BR_FR', 'G_BL_BR_FL', 'G_BL_FR_FL', 'G_BR_FR_FL', 
    'B_C', 'B_BL', 'B_BR', 'B_FR', 'B_FL', 'B_BL_BR', 'B_BL_FR', 'B_BL_FL', 'B_BR_FR', 'B_BR_FL', 'B_FR_FL', 'B_BL_BR_FR', 'B_BL_BR_FL', 'B_BL_FR_FL', 'B_BR_FR_FL'
]

# --- 核心函数 1: 上下合并所有 CSV (原 append.py 的核心逻辑) ---
def step_1_append_all_csvs(output_filename: str, headers: list):
    """
    查找当前目录下所有 CSV 文件（排除输出文件和主信息文件），将其上下合并，
    并保存为新的 CSV 文件，同时加入指定的表头。
    """
    print("="*50)
    print("🚀 步骤 1/2: 垂直合并 (Append) 所有 CSV 文件，并添加表头")
    print("="*50)

    all_filenames = glob.glob('*.csv')
    
    # 排除输出文件、主信息文件和最终输出文件
    csv_files_to_merge = [
        f for f in all_filenames 
        if f != output_filename 
        and f != CONCAT_INPUT_DF1
        and f != FINAL_OUTPUT_FILENAME
    ]

    if not csv_files_to_merge:
        print("⚠️ 警告: 未找到可供合并的 CSV 文件。跳过合并步骤。")
        return None

    all_dataframes = []
    
    for filename in csv_files_to_merge:
        try:
            # 读入时，文件本身仍是无表头的 (header=None)
            df = pd.read_csv(filename, header=None)
            
            # 🆕 检查列数是否匹配新表头
            if df.shape[1] != len(headers):
                print(f"❌ 错误: 文件 {filename} 的列数 ({df.shape[1]}) 与指定表头 ({len(headers)}) 不匹配。跳过该文件。")
                continue
            
            # 🆕 将新的表头赋给当前 DataFrame
            df.columns = headers
            all_dataframes.append(df)
            
        except Exception as e:
            print(f"读取文件 {filename} 时发生错误: {e}。跳过该文件。")

    if not all_dataframes:
        print("⚠️ 警告: 所有可读文件都为空或读取失败。合并结果为空。")
        return None

    # 使用 pd.concat 上下（垂直）合并所有 DataFrame
    combined_df = pd.concat(all_dataframes, axis=0, ignore_index=True)

    # 🆕 保存合并后的结果：header=True 表示将列名 (即指定的 headers) 写入文件
    combined_df.to_csv(output_filename, index=False, header=True)

    print(f"✅ 成功合并 {len(csv_files_to_merge)} 个 CSV 文件。")
    print(f"结果已保存到中间文件: **{output_filename}** ({len(combined_df)} 行, {len(headers)} 列) **并已添加表头**。")
    return output_filename

# --- 核心函数 2: 检查连续重复行 (原 CheckConsecutiveDuplicates_ExclFirstCol.py 的核心逻辑) ---
def check_consecutive_duplicate_rows(file_path: str, column_to_drop: str) -> bool:
    """
    检查 CSV 文件中（排除指定的列，即 scrambleId）是否存在连续相同的两行，并打印结果。
    由于 cross.csv 现在有表头，读取方式已调整。
    """
    print("\n"+"-"*50)
    print("🔍 可选检查: 检查连续重复行 (排除第一列/scrambleId)")
    print("-" * 50)
    
    if not os.path.exists(file_path):
        print(f"错误: 文件 '{file_path}' 未找到，无法执行检查。")
        return False
        
    try:
        # 🆕 由于 cross.csv 现在有表头，我们使用 header=0 来读取
        df = pd.read_csv(file_path, header=0)
    except Exception as e:
        print(f"读取文件 {file_path} 时发生错误: {e}")
        return False

    if df.empty or len(df.columns) <= 1:
        print("警告: 文件内容为空或列数不足。跳过检查。")
        return False

    # 确定用于检查的 DataFrame (排除 'scrambleId' 列)
    if column_to_drop not in df.columns:
        print(f"❌ 错误: 要排除的列 '{column_to_drop}' 不在文件表头中。跳过检查。")
        return False
        
    df_to_check = df.drop(columns=[column_to_drop])
    
    # 核心逻辑：比较当前行和前一行
    consecutive_duplicates = (df_to_check == df_to_check.shift(1)).all(axis=1)

    # 获取重复行的索引
    duplicate_indices = consecutive_duplicates[consecutive_duplicates].index.tolist()
    
    if duplicate_indices:
        pretty_row_numbers = [idx + 2 for idx in duplicate_indices] # +2 因为 header=0 且索引从 0 开始
        print(f"🚨 发现连续重复行 (排除 {column_to_drop})。")
        print(f"重复对中第二行的行号 (基于 1): **{pretty_row_numbers}**")
        print("建议手动检查并清理 'cross.csv' 文件。")
        return True
    else:
        print("✅ 未发现连续重复行 (排除第一列)。数据质量良好。")
        return False

# --- 核心函数 3: 左右拼接 (原 concat.py 的核心逻辑) ---
def step_2_concat_files(df1_path: str, df2_path: str, column_to_drop: str, output_filename: str):
    """
    将两个 CSV 文件左右合并。df2 (cross.csv) 必须先移除指定的重复列。
    """
    print("\n"+"="*50)
    print("🛠️ 步骤 2/2: 水平拼接 (Concat) 文件")
    print("="*50)

    if not os.path.exists(df1_path):
        print(f"❌ 错误: 主文件 **{df1_path}** 未找到。无法进行拼接。")
        return
        
    if not os.path.exists(df2_path):
        print(f"❌ 错误: 中间文件 **{df2_path}** 未找到。无法进行拼接。")
        return

    try:
        # 1. 读取两个 CSV 文件
        df1 = pd.read_csv(df1_path) # 假设 wca_scrambles_info.csv 有表头
        
        # 🆕 cross.csv 现在有表头，可以直接读取
        df2 = pd.read_csv(df2_path)
        
    except Exception as e:
        print(f"读取文件时发生错误: {e}")
        return

    # 2. 移除第二个文件中重复的列 (即 scrambleId)
    if column_to_drop not in df2.columns:
        print(f"❌ 错误: 要删除的列 '{column_to_drop}' 不在 {df2_path} 的表头中。无法继续拼接。")
        return

    df2_data = df2.drop(columns=[column_to_drop])

    # 3. 左右合并：axis=1 表示按列拼接 (基于索引)
    if len(df1) != len(df2_data):
        print(f"⚠️ 警告: 两个文件的行数不一致！df1 ({df1_path}) 有 {len(df1)} 行，df2 ({df2_path}) 有 {len(df2_data)} 行。")
        print("将强制基于索引拼接，结果可能不可靠。")
        
    merged_df = pd.concat([df1, df2_data], axis=1)

    # 4. 保存为新的 CSV 文件
    merged_df.to_csv(output_filename, index=False)

    print(f"✅ 使用 concat 方法合并完成！")
    print(f"新文件 **{output_filename}** 已生成 ({len(merged_df)} 行, {len(merged_df.columns)} 列)。")

# --- 核心函数 4: 删除中间文件 ---
def clean_up_intermediate_file(file_path: str):
    """
    删除指定的中间文件。
    """
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            print(f"\n🗑️ 成功删除中间文件: **{file_path}**")
        except Exception as e:
            print(f"\n❌ 删除文件 {file_path} 时发生错误: {e}")
    else:
        print(f"\nℹ️ 中间文件 {file_path} 不存在，无需删除。")


# ====================================================================
# 主执行块
# ====================================================================

if __name__ == "__main__":
    
    # 1. 执行上下合并 (append.py)，并添加表头
    merged_cross_file = step_1_append_all_csvs(APPEND_OUTPUT_FILENAME, CROSS_CSV_HEADERS)
    
    if merged_cross_file:
        
        # 2. 执行可选的连续重复行检查 (CheckConsecutiveDuplicates_ExclFirstCol.py)
        check_consecutive_duplicate_rows(APPEND_OUTPUT_FILENAME, COLUMN_TO_DROP_IN_CROSS)
        
        # 3. 执行左右拼接 (concat.py)
        step_2_concat_files(
            df1_path=CONCAT_INPUT_DF1,
            df2_path=APPEND_OUTPUT_FILENAME,
            column_to_drop=COLUMN_TO_DROP_IN_CROSS,
            output_filename=FINAL_OUTPUT_FILENAME
        )

        # 4. 🆕 删除中间文件 cross.csv
        clean_up_intermediate_file(APPEND_OUTPUT_FILENAME)

    else:
        print("\n流程终止：步骤 1 未能成功生成合并文件。")
        
        # 🆕 如果步骤 1 失败，但文件可能存在 (例如，之前运行遗留)，仍尝试清理
        clean_up_intermediate_file(APPEND_OUTPUT_FILENAME)
