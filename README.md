# 💾 Batch Cross Analyzer 批量分析十字

这是一个使用 [or18 analyzer](https://github.com/or18/RubiksSolverDemo) 批量计算三阶魔方打乱 **cross,  xcross,  xxcross,  xxxcross** 最少步.

在Chrome中打开 [https://or18.github.io/RubiksSolverDemo/](https://or18.github.io/RubiksSolverDemo/) , 按 `F12` 打开控制台, 执行 `batch_cross_analyzer.js` 中的代码, 弹窗时选择仅含编号列和打乱列的`txt` , 每计算2000行会得到一个`csv`.


# 💾 Batch Cross Analyzer For All WCA Official 3x3 Scrambles 批量分析WCA官方所有三阶打乱的十字

## 1\. 📂 数据准备：导出 WCA 打乱数据

### A. 下载并导出数据

从 https://worldcubeassociation.org/export/results 下载 `sql.zip` , 导入到MySQL Workbench, 导入教程见 https://github.com/RuiminYan/WCA-Statistics . 

执行以下查询代码, 将结果导出为 `wca_scrambles_info.csv` ,  放到 `output` 文件夹.

    SELECT
        scrambleId, 
        scramble, 
        competitionId, 
        eventId, 
        roundTypeId,
        groupId,
        isExtra,
        scrambleNum
    FROM
        wca_export.scrambles
    WHERE
        eventId IN ('333', '333bf', '333oh', '333ft', '333fm', '333mbf')
        AND scrambleId > 5259372 -- **请根据需求更新起始ID**

### B. 预处理

用 `wca_scramble_processor.py` 对 `wca_scrambles_info.csv` 预处理, 得到多个 `part_001.txt` .

## 2\. 🌐 批量求解与结果合并

在Chrome中打开 [https://or18.github.io/RubiksSolverDemo/](https://or18.github.io/RubiksSolverDemo/) , 按 `F12` 打开控制台, 执行 `batch_cross_analyzer.js` 中的代码, 弹窗时选择 `part_001.txt` 等, 得到多个 `part_001_part_001.csv` ,  放到 `output` 文件夹.

## 3\. 📝 数据结构化与导入

将 `wca_scramble_cross_processor.py` 放到 `output` 文件夹, 运行得到 `wca_scrambles_info_cross.csv` .

在 MySQL Workbench 中创建`cross_schema`,  用 `cross_table.sql` 建表.
