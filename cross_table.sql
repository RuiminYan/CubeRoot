DROP TABLE IF EXISTS cross_table;

CREATE TABLE cross_table (
	id BIGINT UNSIGNED PRIMARY KEY,
    scramble TEXT,
    competition_id VARCHAR(32),
    event_id VARCHAR(6),
	round_type_id VARCHAR(1),
    group_id VARCHAR(3),
    is_extra TINYINT,
	scramble_num INT,
    Y_C INT,
    Y_BL INT,
    Y_BR INT,
    Y_FR INT,
    Y_FL INT,
    Y_BL_BR INT,
    Y_BL_FR INT,
    Y_BL_FL INT,
    Y_BR_FR INT,
    Y_BR_FL INT,
    Y_FR_FL INT,
    Y_BL_BR_FR INT,
    Y_BL_BR_FL INT,
    Y_BL_FR_FL INT,
    Y_BR_FR_FL INT,
    W_C INT,
    W_BL INT,
    W_BR INT,
    W_FR INT,
    W_FL INT,
    W_BL_BR INT,
    W_BL_FR INT,
    W_BL_FL INT,
    W_BR_FR INT,
    W_BR_FL INT,
    W_FR_FL INT,
    W_BL_BR_FR INT,
    W_BL_BR_FL INT,
    W_BL_FR_FL INT,
    W_BR_FR_FL INT,
    O_C INT,
    O_BL INT,
    O_BR INT,
    O_FR INT,
    O_FL INT,
    O_BL_BR INT,
    O_BL_FR INT,
    O_BL_FL INT,
    O_BR_FR INT,
    O_BR_FL INT,
    O_FR_FL INT,
    O_BL_BR_FR INT,
    O_BL_BR_FL INT,
    O_BL_FR_FL INT,
    O_BR_FR_FL INT,
    R_C INT,
    R_BL INT,
    R_BR INT,
    R_FR INT,
    R_FL INT,
    R_BL_BR INT,
    R_BL_FR INT,
    R_BL_FL INT,
    R_BR_FR INT,
    R_BR_FL INT,
    R_FR_FL INT,
    R_BL_BR_FR INT,
    R_BL_BR_FL INT,
    R_BL_FR_FL INT,
    R_BR_FR_FL INT,
    G_C INT,
    G_BL INT,
    G_BR INT,
    G_FR INT,
    G_FL INT,
    G_BL_BR INT,
    G_BL_FR INT,
    G_BL_FL INT,
    G_BR_FR INT,
    G_BR_FL INT,
    G_FR_FL INT,
    G_BL_BR_FR INT,
    G_BL_BR_FL INT,
    G_BL_FR_FL INT,
    G_BR_FR_FL INT,
    B_C INT,
    B_BL INT,
    B_BR INT,
    B_FR INT,
    B_FL INT,
    B_BL_BR INT,
    B_BL_FR INT,
    B_BL_FL INT,
    B_BR_FR INT,
    B_BR_FL INT,
    B_FR_FL INT,
    B_BL_BR_FR INT,
    B_BL_BR_FL INT,
    B_BL_FR_FL INT,
    B_BR_FR_FL INT
);

LOAD DATA INFILE 'C:/ProgramData/MySQL/MySQL Server 8.0/Uploads/wca_scrambles_info_cross.csv'
INTO TABLE cross_table
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS;

-- 添加列
ALTER TABLE cross_table
ADD COLUMN Y_XC INT,
ADD COLUMN W_XC INT,
ADD COLUMN O_XC INT,
ADD COLUMN R_XC INT,
ADD COLUMN G_XC INT,
ADD COLUMN B_XC INT,
ADD COLUMN Y_XXC INT,
ADD COLUMN W_XXC INT,
ADD COLUMN O_XXC INT,
ADD COLUMN R_XXC INT,
ADD COLUMN G_XXC INT,
ADD COLUMN B_XXC INT,
ADD COLUMN Y_XXXC INT,
ADD COLUMN W_XXXC INT,
ADD COLUMN O_XXXC INT,
ADD COLUMN R_XXXC INT,
ADD COLUMN G_XXXC INT,
ADD COLUMN B_XXXC INT,

ADD COLUMN DUAL_C INT,
ADD COLUMN DUAL_XC INT,
ADD COLUMN DUAL_XXC INT,
ADD COLUMN DUAL_XXXC INT,

ADD COLUMN CN_C INT,
ADD COLUMN CN_XC INT,
ADD COLUMN CN_XXC INT,
ADD COLUMN CN_XXXC INT;

-- 计算列
SET SQL_SAFE_UPDATES = 0;
UPDATE cross_table
SET
	Y_XC = LEAST(Y_BL, Y_BR, Y_FR, Y_FL),
    W_XC = LEAST(W_BL, W_BR, W_FR, W_FL),
    O_XC = LEAST(O_BL, O_BR, O_FR, O_FL),
    R_XC = LEAST(R_BL, R_BR, R_FR, R_FL),
    G_XC = LEAST(G_BL, G_BR, G_FR, G_FL),
    B_XC = LEAST(B_BL, B_BR, B_FR, B_FL),
    
    Y_XXC = LEAST(Y_BL_BR, Y_BL_FR, Y_BL_FL, Y_BR_FR, Y_BR_FL, Y_FR_FL),
    W_XXC = LEAST(W_BL_BR, W_BL_FR, W_BL_FL, W_BR_FR, W_BR_FL, W_FR_FL),
    O_XXC = LEAST(O_BL_BR, O_BL_FR, O_BL_FL, O_BR_FR, O_BR_FL, O_FR_FL),
    R_XXC = LEAST(R_BL_BR, R_BL_FR, R_BL_FL, R_BR_FR, R_BR_FL, R_FR_FL),
    G_XXC = LEAST(G_BL_BR, G_BL_FR, G_BL_FL, G_BR_FR, G_BR_FL, G_FR_FL),
    B_XXC = LEAST(B_BL_BR, B_BL_FR, B_BL_FL, B_BR_FR, B_BR_FL, B_FR_FL),

    Y_XXXC = LEAST(Y_BL_BR_FR, Y_BL_BR_FL, Y_BL_FR_FL, Y_BR_FR_FL),
    W_XXXC = LEAST(W_BL_BR_FR, W_BL_BR_FL, W_BL_FR_FL, W_BR_FR_FL),
    O_XXXC = LEAST(O_BL_BR_FR, O_BL_BR_FL, O_BL_FR_FL, O_BR_FR_FL),
    R_XXXC = LEAST(R_BL_BR_FR, R_BL_BR_FL, R_BL_FR_FL, R_BR_FR_FL),
    G_XXXC = LEAST(G_BL_BR_FR, G_BL_BR_FL, G_BL_FR_FL, G_BR_FR_FL),
    B_XXXC = LEAST(B_BL_BR_FR, B_BL_BR_FL, B_BL_FR_FL, B_BR_FR_FL),

    DUAL_C = LEAST(Y_C, W_C),
    DUAL_XC = LEAST(Y_XC, W_XC),
    DUAL_XXC = LEAST(Y_XXC, W_XXC),
    DUAL_XXXC = LEAST(Y_XXXC, W_XXXC),

    CN_C = LEAST(Y_C, W_C, O_C, R_C, G_C, B_C),
    CN_XC = LEAST(Y_XC, W_XC, O_XC, R_XC, G_XC, B_XC),
    CN_XXC = LEAST(Y_XXC, W_XXC, O_XXC, R_XXC, G_XXC, B_XXC),
    CN_XXXC = LEAST(Y_XXXC, W_XXXC, O_XXXC, R_XXXC, G_XXXC, B_XXXC);

SET SQL_SAFE_UPDATES = 1;











-- 统计
-- 计算新列平均值
SELECT
    AVG(W_BL) AS avg_W_BL,
    AVG(W_BL_BR) AS avg_W_BL_BR,
    AVG(W_BL_FR) AS avg_W_BL_FR,
    AVG(W_BL_BR_FR) AS avg_W_BL_BR_FR,
    
    AVG(W_C) AS avg_W_C,
    AVG(DUAL_C) AS avg_DUAL_C,
    AVG(CN_C) AS avg_CN_C,
    
    AVG(W_XC) AS avg_W_XC,
    AVG(DUAL_XC) AS avg_DUAL_XC,
    AVG(CN_XC) AS avg_CN_XC,
    
    AVG(W_XXC) AS avg_W_XXC,
    AVG(DUAL_XXC) AS avg_DUAL_XXC,
    AVG(CN_XXC) AS avg_CN_XXC,
    
    AVG(W_XXXC) AS avg_W_XXXC,
    AVG(DUAL_XXXC) AS avg_DUAL_XXXC,
    AVG(CN_XXXC) AS avg_CN_XXXC
FROM 
    cross_table;


-- 计算W_BL 列的分布
SELECT
    t1.W_BL AS move_count,                                          -- W_BL 列的数值 (步数)
    t1.frequency,                                                   -- 该数值出现的次数 (频率)
    
    -- 1. 频率倒数
    CAST(
        100 / NULLIF( (t1.frequency / (SELECT COUNT(*) FROM cross_table)) * 100, 0)
        AS UNSIGNED
    ) AS reciprocal_of_percentage, 

    -- 2. 频率 (保留两位小数)
    ROUND((t1.frequency / (SELECT COUNT(*) FROM cross_table)) * 100, 2) AS percentage 
    
FROM
    (
        -- 子查询 t1: 计算每一步的频率
        SELECT
            W_BL,
            COUNT(*) AS frequency
        FROM
            cross_table
        GROUP BY
            W_BL
    ) AS t1
ORDER BY
    move_count ASC;



-- 找特定的打乱
SELECT 
    * FROM 
    cross_table 
ORDER BY 
    CN_XC ASC 
LIMIT 100;

 
