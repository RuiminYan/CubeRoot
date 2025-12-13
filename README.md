# 💾 Batch Cross Solver 批量求解流程

这是一个使用 [or18 solver](https://github.com/or18/RubiksSolverDemo) 批量计算三阶魔方打乱的 **cross,  xcross,  xxcross,  xxxcross** 最少步, 并将数据导入数据库的完整流程.

## 1\. 📂 数据准备：导出 WCA 打乱数据

### A. 下载并导出数据

从  https://worldcubeassociation.org/export/results 下载 `sql.zip` , 导入到 **MySQL Workbench**. 

执行以下查询代码, 将结果导出为 `wca_scrambles_info.csv` ,  放到 `output` 文件夹.

    SELECT
        scrambleId, 
        scramble, 
        competitionId, 
        eventId, 
        isExtra
    FROM
        wca_export.scrambles
    WHERE
        eventId IN ('333',  '333bf',  '333oh',  '333ft',  '333fm')
        AND scrambleId > 5259372 -- **请根据需求更新起始ID**

### B. 分割文件

用 `first_2_col_no_wide_move_split.py` 对 `wca_scrambles_info.csv` 进行处理和分割, 得到多个 `part_001.txt` .


## 2\. 🌐 批量求解与结果合并

在Chrome中打开 [https://or18.github.io/RubiksSolverDemo/](https://or18.github.io/RubiksSolverDemo/) 的控制台, 执行 `batch cross solver.js` 中的代码, 弹窗时选择 `part_001.txt` 等, 得到多个 `part_001_part_001.csv` ,  放到 `output` 文件夹.

## 3\. 📝 数据结构化与导入

编辑 `wca_scrambles_info.csv` ,  仅保留其中需要的行.

将 `append_CheckConsecutiveDuplicates_ExclFirstCol_concat.py` 放到 `output` 文件夹, 运行得到 `wca_scrambles_info_cross.csv` .
        
将 `wca_scrambles_info_cross.csv` 复制到 MySQL 的安全导入路径: `C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\` 

在 MySQL Workbench 中创建`cross_schema`,  用 `cross_table.sql` .
