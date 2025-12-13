# 💾 Batch Cross Solver 批量求解流程

这是一个使用 **or18 Solver** 批量计算三阶魔方打乱的 **cross, xcross, xxcross, xxxcross** 最少步状态，并将数据导入数据库的完整流程。

## 1\. 📂 数据准备：导出 WCA 打乱数据

### A. 导出数据

从  https://worldcubeassociation.org/export/results 导出 SQL 数据，并导入到 **MySQL Workbench**。执行以下查询并将结果导出为 **`wca_scrambles_info.csv`**。

    SELECT
        scrambleId,
        scramble,
        competitionId,
        eventId,
        isExtra
    FROM
        wca_export.scrambles
    WHERE
        eventId IN ('333', '333bf', '333oh', '333ft', '333fm')
        AND scrambleId > 5259372 -- **请根据需求更新起始ID**

### B. 分割文件

使用 `only_2_row_no_wide_move_split.py` 脚本对 `wca_scrambles_info.csv` 进行分割。

-   每个分割文件包含 **10000 行**数据。
    
-   文件名自动设定为 `part_xxx.csv`。
    
-   将所有分割后的文件移动到 **`input`** 文件夹。
    

## 2\. 🌐 批量求解与结果合并

### A. 批量求解

1.  打开批量求解网站：[https://or18.github.io/RubiksSolverDemo/](https://or18.github.io/RubiksSolverDemo/)
    
2.  将 `batch cross solver.js` 代码复制并粘贴到 **Chrome 控制台 (Console)** 中执行。
    
3.  **指定输出文件名前缀**（例如：`xxx`）。
    
4.  脚本会自动运行求解，结果会自动导出为多个 CSV 文件。
    
    -   每个导出文件包含 **2000 行**数据。
        
    -   文件名自动设定为 `xxx_part1.csv`、`xxx_part2.csv` 等。
        
5.  将所有导出的 CSV 文件移动到 **`output`** 文件夹。
    

### B. 合并与检查

1.  使用 `append.py` 脚本，将 `output` 文件夹中的所有 `xxx_partN.csv` 文件**行拼接**（纵向合并）成 **`cross.csv`**。
    
2.  使用 `CheckConsecutiveDuplicates_ExclFirstCol.py` 检查 `cross.csv`，确保除了第一列外没有相邻的重复行。
    

## 3\. 📝 数据结构化与导入

### A. 插入表头

手动编辑 `cross.csv` 文件，在第一行插入完整的表头，以确保列名正确对应。

    scrambleId,Y_C,Y_BL,Y_BR,Y_FR,Y_FL,Y_BL_BR,Y_BL_FR,Y_BL_FL,Y_BR_FR,Y_BR_FL,Y_FR_FL,Y_BL_BR_FR,Y_BL_BR_FL,Y_BL_FR_FL,Y_BR_FR_FL,W_C,W_BL,W_BR,W_FR,W_FL,W_BL_BR,W_BL_FR,W_BL_FL,W_BR_FR,W_BR_FL,W_FR_FL,W_BL_BR_FR,W_BL_BR_FL,W_BL_FR_FL,W_BR_FR_FL,O_C,O_BL,O_BR,O_FR,O_FL,O_BL_BR,O_BL_FR,O_BL_FL,O_BR_FR,O_BR_FL,O_FR_FL,O_BL_BR_FR,O_BL_BR_FL,O_BL_FR_FL,O_BR_FR_FL,R_C,R_BL,R_BR,R_FR,R_FL,R_BL_BR,R_BL_FR,R_BL_FL,R_BR_FR,R_BR_FL,R_FR_FL,R_BL_BR_FR,R_BL_BR_FL,R_BL_FR_FL,R_BR_FR_FL,G_C,G_BL,G_BR,G_FR,G_FL,G_BL_BR,G_BL_FR,G_BL_FL,G_BR_FR,G_BR_FL,G_FR_FL,G_BL_BR_FR,G_BL_BR_FL,G_BL_FR_FL,G_BR_FR_FL,B_C,B_BL,B_BR,B_FR,B_FL,B_BL_BR,B_BL_FR,B_BL_FL,B_BR_FR,B_BR_FL,B_FR_FL,B_BL_BR_FR,B_BL_BR_FL,B_BL_FR_FL,B_BR_FR_FL

### B. 列拼接与导入准备

1.  使用 `concat.py` 脚本将 **`wca_scrambles_info.csv`** 和 **`cross.csv`** **列拼接**（横向合并）得到 **`wca_scrambles_info_cross.csv`**。
    
    -   **注意：** 确保文件最后一行非空。
        
2.  将 `wca_scrambles_info_cross.csv` 复制到 MySQL 的安全导入路径： `C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\`
    

### C. 数据库导入

在 MySQL Workbench 中执行 `cross_table.sql` 脚本，将数据导入到数据库中。



