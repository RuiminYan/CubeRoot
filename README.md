# 💾 Batch Cross Solver 批量求解流程

这是一个使用 **or18 Solver** 批量计算三阶魔方打乱的 **cross, xcross, xxcross, xxxcross** 最少步状态，并将数据导入数据库的完整流程。

## 1\. 📂 数据准备：导出 WCA 打乱数据

### A. 导出数据

从  https://worldcubeassociation.org/export/results 下载 SQL 数据，并导入到 **MySQL Workbench**。执行以下查询并将结果导出为 `wca_scrambles_info.csv`。

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


## 2\. 🌐 批量求解与结果合并

### A. 批量求解

1.  打开批量求解网站：[https://or18.github.io/RubiksSolverDemo/](https://or18.github.io/RubiksSolverDemo/)
    
2.  将 `batch cross solver.js` 代码复制并粘贴到 **Chrome 控制台 (Console)** 中执行，脚本会自动运行求解并自动导出为多个 CSV 文件，将它们移动到 `output` 文件夹。

## 2\. 📝 数据结构化与导入

### A. 列拼接与导入准备

1.  编辑 `wca_scrambles_info.csv` , 仅保留其中需要的行. 使用 `append_CheckConsecutiveDuplicates_ExclFirstCol_concat.py` 脚本将 `wca_scrambles_info.csv` 和 `cross.csv` **列拼接**（横向合并）得到 `wca_scrambles_info_cross.csv`。
    
    -   **注意：** 确保文件最后一行非空。
        
2.  将 `wca_scrambles_info_cross.csv` 复制到 MySQL 的安全导入路径： `C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\`
    

### B. 数据库导入

2. 在 MySQL Workbench 中创建`cross_schema`, 使用 `cross_table.sql` 脚本。
