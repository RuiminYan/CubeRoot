需要做的优化：移除Emscripten 代码, 实现本地运行，生成移动表(move_table_.bin)和剪枝表(prune_table_.bin)写入硬盘，4位打包 (4-bit packing), 多线程 (OpenMP)，只保留聚合数据（最小值）(aggregation)，分支定界（Branch and Bound），任务排序 (Task Sorting)，旋转对称优化（conj）

这里给出了一系列三阶魔方不完整状态的最少步求解器.

std_analyzer.cpp求解了cross,xc(即xcross),xxc(即xxcross),xxxc(即xxxcross),xxxxc(即xxxxcross)的最少步.

xcross表示还原cross+1组F2L

xxcross表示还原cross+2组F2L

xxxcross表示还原cross+3组F2L

xxxxcross表示还原cross+4组F2L


pseudo_analyzer.cpp求解了psc(即pseudo_cross),psxc(即pseudo_xcross),psxxc(即pseudo_xxcross),psxxxc(即pseudo_xxxcross)的最少步.

pseudo_cross表示还原cross, 允许D层偏移.

pseudo_xcross表示还原cross+1个底层角块+1个中层棱块, 允许D层偏移.

pseudo_xxcross表示还原cross+2个底层角块+2个中层棱块, 允许D层偏移.

pseudo_xxxcross表示还原cross+3个底层角块+3个中层棱块, 允许D层偏移.


pair (基态), 全称free pair, 指的是能通过0步或3步入槽的F2L, 例如R U R', R U' R', R U2 R'及其镜像等，当然开头可以有U层调整，例如U' R U R'. 当然, 如果某一组F2L已经还原了 (即0步入槽), 我们也称这一组F2L为free pair.

pair_analyzer.cpp求解了crossp(即cross + 1 pair),xcp(即xcross + 1 pair),xxcp(即xxcross + 1 pair),xxxcp(即xxxcross + 1 pair)的最少步.

定义cross + 1 pair. 例如cross + 1 pair(BL槽)是对BL槽xcross的拓展, 包含的状态不仅有BL槽已经还原的xcross，还包括通过L U L', L U' L', B' U B, B' U' B就能变成xcross(BL槽)的状态，以及通过转动U层，再通过L U L', L U' L', B' U B, B' U' B变成xcross(BL槽)的状态.

定义xcross + 1 pair. 例如xcross(BR槽) + 1 pair(BL槽)是xxcross(BR槽+BL槽)的拓展, 包含的状态不仅有BR槽+BL槽都已经还原的xxcross，还包括通过L U L', L U' L', B' U B, B' U' B就能变成xxcross(BR槽+BL槽)的状态，以及通过转动U层，再通过L U L', L U' L', B' U B, B' U' B变成xxcross(BR槽+BL槽)的状态.

定义xxcross + 1 pair. 例如xxcross(BR槽+FR槽) + 1 pair(BL槽)是xxcross(BR槽+BL槽)的拓展, 包含的状态不仅有BL槽+BR槽+FR槽都已经还原的xxcross，还包括通过L U L', L U' L', B' U B, B' U' B就能变成xxxcross(BL槽+BR槽+FR槽)的状态，以及通过转动U层，再通过L U L', L U' L', B' U B, B' U' B变成xxxcross(BL槽+BR槽+FR槽)的状态.

定义xxxcross + 1 pair. 例如xxxcross(BR槽+FR槽+FL槽) + 1 pair(BL槽)是xxxxcross(BL槽+BR槽+FR槽+FL槽)的拓展, 包含的状态不仅有BL槽+BR槽+FR槽+FL槽都已经还原的xxxxcross，还包括通过L U L', L U' L', B' U B, B' U' B就能变成xxxxcross(BL槽+BR槽+FR槽+FL槽)的状态，以及通过转动U层，再通过L U L', L U' L', B' U B, B' U' B变成xxxcrossxxxxcross(BL槽+BR槽+FR槽+FL槽)的状态.


pseudo pair, 全称pseudo free pair, 指的是能通过3步将角块放入角块的目标槽，同时将棱块放入棱块的目标槽, 注意不要求是同一个槽位.

pseudo_pair_analyzer.cpp求解了pscp(即pseudo_cross + 1 pseudo pair),psxcp(即pseudo_xcross + 1 pseudo pair),psxxcp(即pseudo_xxcross + 1 pseudo pair),psxxxcp(即pseudo_xxxcross + 1 pseudo pair)的最少步.


eo_cross_analyzer.cpp求解了eoc(即cross+eo),eoxc(即xcross+eo),eoxxc(即xxcross+eo),eoxxxc(即xxxcross+eo)的最少步.

编译和运行：
```
g++ -O3 -fopenmp -march=native analyzer.cpp -o analyzer
echo scramble.txt | .\analyzer.exe
```

-   **角块**：状态值 = ID × 3 + 色向 (0,1,2)
-   **棱块**：状态值 = ID × 2 + 色向 (0,1)

### 角块物理ID
-   **C0 (UBL)**: 顶层后左角块，状态值 = 0
-   **C1 (UBR)**: 顶层后右角块，状态值 = 3
-   **C2 (UFR)**: 顶层前右角块，状态值 = 6    
-   **C3 (UFL)**: 顶层前左角块，状态值 = 9  
-   **C4 (DBL)**: 基准角块，状态值 = 12  
-   **C5 (DBR)**: 左侧扩展角块，状态值 = 15
-   **C6 (DFR)**: 后侧扩展角块，状态值 = 18
-   **C7 (DFL)**: 右侧扩展角块，状态值 = 21

### 棱块物理ID
-   **E0 (BL)**: 基准棱块，状态值 = 0
-   **E1 (BR)**: 左侧扩展棱块，状态值 = 2
-   **E2 (FR)**: 后侧扩展棱块，状态值 = 4    
-   **E3 (FL)**: 右侧扩展棱块，状态值 = 6    
-   **E4 (UB)**: 顶层后棱块，状态值 = 8    
-   **E5 (UR)**: 顶层右棱块，状态值 = 10    
-   **E6 (UF)**: 顶层前棱块，状态值 = 12    
-   **E7 (UL)**: 顶层左棱块，状态值 = 14    
-   **E8 (DB)**: 底层后棱块，状态值 = 16    
-   **E9 (DR)**: 底层右棱块，状态值 = 18    
-   **E10 (DF)**: 底层前棱块，状态值 = 20    
-   **E11 (DL)**: 底层左棱块，状态值 = 22


角块位置图

              +-------+
              | 0   1 |
              |   U   |
              | 3   2 |
      +-------+-------+-------+-------+
      | 0   3 | 3   2 | 2   1 | 1   0 |
      |   L   |   F   |   R   |   B   |
      | 4   7 | 7   6 | 6   5 | 5   4 |
      +-------+-------+-------+-------+
              | 7   6 |
              |   D   |
              | 4   5 |
              +-------+

棱块位置图

              +-------+
              |   4   |
              | 7 U 5 |
              |   6   |
      +-------+-------+-------+-------+
      |   7   |   6   |   5   |   4   |
      | 0 L 3 | 3 F 2 | 2 R 1 | 1 B 0 |
      |   11  |   10  |   9   |   8   |
      +-------+-------+-------+-------+
              |   10  |
              | 11 D 9|
              |   8   |
              +-------+

以下是代码中涉及的主要索引取值范围：

### 1\. 角块索引 (Corner Index)

角块状态由 **8 个位置** 和 **3 种朝向** 组成。

-   **单个角块状态：** 取值范围是 **0 ~ 23**。
    
    -   计算公式：3×位置(0\-7)+朝向(0\-2)。
        
    -   在代码中体现为 `create_corner_move_table` 的循环上限 `i < 24`。
        
-   **角块朝向总和 (CO Index)：** 取值范围是 **0 ~ 2186**。
    
    -   计算逻辑：由于魔方最后一颗角块的朝向由前 7 颗决定（受约束），总状态数为 37\=2187。
        
    -   在代码中体现为 `create_co_move_table` 的大小 `2187 * 18`。
        

* * *

### 2\. 棱块索引 (Edge Index)

棱块状态由 **12 个位置** 和 **2 种朝向** 组成。

-   **单个棱块状态：** 取值范围是 **0 ~ 23**。
    
    -   计算公式：2×位置(0\-11)+朝向(0\-1)。
        
    -   在代码中体现为 `create_edge_move_table` 的循环上限 `i < 24`。
        
-   **棱块朝向总和 (EO Index)：** 取值范围是 **0 ~ 2047**。
    
    -   计算逻辑：最后一颗棱块朝向受约束，总状态数为 211\=2048。
        
    -   在代码中体现为 `create_eo_move_table` 的大小 `2048 * 18`。
        

* * *

### 3\. 组合索引 (Multi-Block Index)

代码中为了处理十字（Cross）和扩展十字（X-Cross），使用了多个块的组合索引，这些范围最大：

-   **Cross 棱块组合 (2个棱块组合)：** 取值范围是 **0 ~ 527**。
    
    -   在 `cross_analyzer` 中，`index1` 和 `index2` 各代表一对棱块（共 4 颗）。其大小为 `24 * 22 = 528`。
        
-   **X-Cross 棱块组合 (4个棱块组合)：** 取值范围是 **0 ~ 190,079**。
    
    -   在 `xcross_analyzer2` 中，使用了 `24 * 22 * 20 * 18 = 190,080` 的大小。
        
    -   你之前好奇的 `187520` 就是在这个 0∼190079 范围内的一个特定数值，代表了底层 4 颗棱块全部归位的状态。



