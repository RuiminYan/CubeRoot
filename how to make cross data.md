这是在https://or18.github.io/RubiksSolverDemo/ 中批量输出三阶魔方cross,xcross,xxcross,xxxcross最少步的流程

📂 数据准备：从 WCA 数据库导出打乱
在MySQL Workbench中使用以下查询并导出为wca_scrambles_info.csv

```sql
SELECT
-- 行号 ROW_NUMBER() OVER (ORDER BY scrambleId) AS row_num,
    scrambleId,
    scramble,
    competitionId,
    eventId,
    isExtra
FROM
    wca_export.scrambles
WHERE
    eventId IN ('333', '333bf', '333oh', '333ft', '333fm')
    AND scrambleId > 5259372 -- 更改这里
```

用only_2_row_no_wide_move_split.py将wca_scrambles_info.csv分割成多个csv, 每个10000行, 文件名自动设定为part_xxx, 移动到input文件夹

复制batch cross solver.js代码到Chrome控制台, 指定输出文件名前缀为xxx, 自动导出的csv有多个, 每个2000行, 文件名自动设定为xxx_part1~5, 移动到output文件夹

用append.py行拼接它们得到cross.csv, 用CheckConsecutiveDuplicates_ExclFirstCol.py检查是否有相邻的重复行

cross.csv中, 手动插入表头
```
scrambleId,Y_C,Y_BL,Y_BR,Y_FR,Y_FL,Y_BL_BR,Y_BL_FR,Y_BL_FL,Y_BR_FR,Y_BR_FL,Y_FR_FL,Y_BL_BR_FR,Y_BL_BR_FL,Y_BL_FR_FL,Y_BR_FR_FL,W_C,W_BL,W_BR,W_FR,W_FL,W_BL_BR,W_BL_FR,W_BL_FL,W_BR_FR,W_BR_FL,W_FR_FL,W_BL_BR_FR,W_BL_BR_FL,W_BL_FR_FL,W_BR_FR_FL,O_C,O_BL,O_BR,O_FR,O_FL,O_BL_BR,O_BL_FR,O_BL_FL,O_BR_FR,O_BR_FL,O_FR_FL,O_BL_BR_FR,O_BL_BR_FL,O_BL_FR_FL,O_BR_FR_FL,R_C,R_BL,R_BR,R_FR,R_FL,R_BL_BR,R_BL_FR,R_BL_FL,R_BR_FR,R_BR_FL,R_FR_FL,R_BL_BR_FR,R_BL_BR_FL,R_BL_FR_FL,R_BR_FR_FL,G_C,G_BL,G_BR,G_FR,G_FL,G_BL_BR,G_BL_FR,G_BL_FL,G_BR_FR,G_BR_FL,G_FR_FL,G_BL_BR_FR,G_BL_BR_FL,G_BL_FR_FL,G_BR_FR_FL,B_C,B_BL,B_BR,B_FR,B_FL,B_BL_BR,B_BL_FR,B_BL_FL,B_BR_FR,B_BR_FL,B_FR_FL,B_BL_BR_FR,B_BL_BR_FL,B_BL_FR_FL,B_BR_FR_FL
```
用concat.py列拼接wca_scrambles_info.csv和cross.csv得到wca_scrambles_info_cross.csv, 注意最后一行不要为空, 复制到C:\ProgramData\MySQL\MySQL Server 8.0\Uploads\, 后续操作见cross_table.sql




