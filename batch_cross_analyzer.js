// https://or18.github.io/RubiksSolverDemo/
// Show Analyzer, 全选Face Option
// 从None列到x列共6列，15行，输出里面的所有内容，按列取内容
// 可将数字15替换成表格实际有的行数
// .txt应有2列，第一列为编号列，第二列为打乱列
// Chrome按F12进入控制台输入以下内容
// 每个导出的csv包含2000行记录

// ==================== 1️⃣ 选择 scrambles.txt 并读取 ====================
function loadScramblesFromLocalFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";

    input.onchange = () => {
      const file = input.files[0];
      if (!file) return reject("未选择文件");

      // 提取文件名作为前缀，去除扩展名 .txt
      const fileName = file.name.replace(/\.txt$/, '');

      const reader = new FileReader();
      reader.onload = () => {
        const lines = reader.result.split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l);

        // 🚀 修改点：更新 console.log 输出格式
        console.log(`✅ 已加载文件 ${file.name}，共 ${lines.length} 条记录（含编号 + 打乱）`);

        // 解析成 { id, scramble }
        const parsed = lines.map(l => {
          const parts = l.split(",");
          return {
            id: parts[0].trim(),
            scramble: parts[1].trim()
          };
        });

        resolve({ scrambles: parsed, fileName: fileName }); 
      };
      reader.onerror = () => reject("读取文件失败");
      reader.readAsText(file);
    };

    input.click();
  });
}

// ==================== 2️⃣ 等待表格真正“完全加载” ====================
async function waitForTableComplete({
  timeout = 20000,
  expectedRows = 15,
  columns = ["None","z2","z'","z","x'","x"]
} = {}) {

  const start = Date.now();

  while (Date.now() - start < timeout) {
    const table = document.querySelector("table");
    if (!table) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    const headerCells = Array.from(
      table.querySelectorAll("thead th, tr:first-child th, tr:first-child td")
    );

    const noIdx = headerCells.findIndex(th => th.innerText.trim() === "No");
    if (noIdx === -1) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    const colIndices = columns.map(name =>
      headerCells.findIndex(h => h.innerText.trim() === name)
    );

    if (colIndices.some(idx => idx === -1)) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    const rows = Array.from(table.querySelectorAll("tbody tr, tr")).slice(1);

    if (rows.length < expectedRows) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    const noValues = rows.map(r =>
      parseInt(r.children[noIdx]?.innerText.trim())
    ).filter(v => !isNaN(v));

    if (!noValues.includes(expectedRows)) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    const allCellsPresent = rows.slice(0, expectedRows).every(row =>
      colIndices.every(ci => {
        const c = row.children[ci];
        return c && c.innerText != null && c.innerText.toString().trim() !== "";
      })
    );

    if (allCellsPresent) {
      return { table, headerCells, colIndices, rows: rows.slice(0, expectedRows) };
    }

    await new Promise(r => setTimeout(r, 200));
  }

  const table = document.querySelector("table");
  const headerCells = table ? Array.from(
    table.querySelectorAll("thead th, tr:first-child th, tr:first-child td")
  ) : [];

  const colIndices = headerCells.length
    ? columns.map(name => headerCells.findIndex(h => h.innerText.trim() === name))
    : [];

  const rows = table
    ? Array.from(table.querySelectorAll("tbody tr, tr")).slice(1, 15+1)
    : [];

  return { table, headerCells, colIndices, rows };
}

// ==================== 3️⃣ 按“列优先”读取 15*6 个数 ====================
function readNumbersByColumns({ rows, colIndices }) {
  const result = [];

  colIndices.forEach(ci => {
    rows.forEach(row => {
      const cell = row.children[ci];
      const v = cell ? parseInt(cell.innerText.trim()) : NaN;
      result.push(isNaN(v) ? null : v);
    });
  });

  return result;
}

// ==================== 4️⃣ 永久等待直到完整读到 15*6 个数 ====================
async function stableReadTable({
  expectedRows = 15,
  columns = ["None","z2","z'","z","x'","x"],
  shortWaitTimeout = 20000,
  pauseBetweenChecks = 500
} = {}) {

  const expectedTotal = expectedRows * columns.length;

  while (true) {
    const tableInfo = await waitForTableComplete({
      timeout: shortWaitTimeout,
      expectedRows,
      columns
    });

    const values = readNumbersByColumns(tableInfo);
    const validCount = values.filter(v => v !== null).length;

    if (validCount === expectedTotal) return values;

    await new Promise(r => setTimeout(r, pauseBetweenChecks));
  }
}

// 6. Function to check if a button is inside a hidden details element (从代码1移动到全局作用域)
function isInsideHiddenDetails(button) {
    let parent = button.closest('details');
    return parent && parent.classList.contains('hidden'); // Check if it has the hidden class
}

// ==================== 5️⃣ 批量处理（仅输出编号 + 15*6列） ====================
async function batchProcess(scrambles, baseName) { // 🚀 修改点 2：接收 baseName
    const input = document.querySelector("textarea");
    // const analyzeBtn = [...document.querySelectorAll("button")]
    //   .find(b => b.innerText.toLowerCase().includes("analy"));

    if (!input) {
        console.error("❌ 找不到 Scramble 输入框");
        return;
    }

    // 🚀 修改点 3：移除 prompt 部分，直接使用传入的 baseName
    if (!baseName) {
        console.error("❌ 未传入文件名前缀，已取消");
        return;
    }

    let csvBuffer = "";
    let processed = 0;
    let filePart = 1;
    // 🔔 增加警告计数器
    let warningCount = 0;

    const globalStart = performance.now();

    for (let i = 0; i < scrambles.length; i++) {
        const { id, scramble } = scrambles[i];

        const t0 = performance.now();

        // 1. 同步操作：输入打乱步骤
        input.value = scramble;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        
        // 2. 同步操作：点击分析按钮，触发计算 (替换为代码1中的逻辑)
        // 1. Locate all details elements with "analyze" in their id and open them
        const detailsElements = document.querySelectorAll("details[id*='analyze']"); // Filter details with "analyze" in the id
        detailsElements.forEach(details => {
            if (!details.open) {
                details.open = true; // Open the <details> element
                // console.log("Opened details element with ID:", details.id); // 批量模式下静默输出
            }
        });

        // 2. Locate all buttons
        const analyzeBtns = [...document.querySelectorAll("button")]
            .filter(b => 
                b.innerText.toLowerCase().includes("analy") && 
                !b.classList.contains("hidden") && 
                !isInsideHiddenDetails(b) // Check if it is inside a hidden details element
            );
        
        // 3. Click each detected button
        analyzeBtns.forEach(btn => {
            btn.click(); // Click the button
            // console.log(`✅ Analyze button clicked: ${btn.id}`); // 批量模式下静默输出
        });
        
        if (analyzeBtns.length === 0) {
            console.warn(`⚠️ 打乱 ${id} 警告：未找到可见的 Analyze 按钮，跳过.`);
            // 🟢 延迟 2 (100ms)：循环间歇休息
            if (i < scrambles.length - 1) { 
             await new Promise(r => setTimeout(r, 100)); 
            }
            continue;
        }

        // 🟢 延迟 1 (50ms): 防御性延迟
        await new Promise(r => setTimeout(r, 50)); 
        
        // 3. 核心等待：等待表格数据完全加载
        const values = await stableReadTable();

        const t1 = performance.now();
        const costMs = t1 - t0; // 计算毫秒数
        const costSec = (costMs / 1000).toFixed(3);

        // 🔔 检查是否为警告（小于 1499 毫秒）
        if (costMs < 1499) {
            warningCount++;
        }

        console.log(`${i + 1} / ${scrambles.length} 用时 ${costSec}s`);

        // ⚠️ 最终要求：只输出「编号 + 15*6列」
        csvBuffer += `${id},${values.join(",")}\n`;

        processed++;

        if (processed % 2000 === 0 || i === scrambles.length - 1) {
            const partFilename = `${baseName}_part_${filePart}.csv`;
            downloadCSVBuffer(csvBuffer, partFilename);
            console.log(`💾 已生成 ${partFilename}，释放内存`);
            csvBuffer = "";
            filePart++;
        }
        
        // 🟢 延迟 2 (100ms)：循环间歇休息
        if (i < scrambles.length - 1) { 
             await new Promise(r => setTimeout(r, 100)); 
        }
    }

    const globalEnd = performance.now();
    const totalSec = ((globalEnd - globalStart) / 1000).toFixed(3);
    
    // 🔔 在最终输出前，输出警告次数
    console.warn(`⚠️ 警告：共有 ${warningCount} 次运算用时小于1.499s。`);
    console.log(`⏰ 总共用时: ${totalSec}s`);
}

// ==================== 6️⃣ 下载 CSV ====================
function downloadCSVBuffer(csvBuffer, filename) {
  const blob = new Blob([csvBuffer], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

// ==================== 7️⃣ 主入口 ====================
async function main() {
  const result = await loadScramblesFromLocalFile(); // 🚀 修改点 4：接收包含 scrambles 和 fileName 的结果对象
  const scrambles = result.scrambles;
  const fileName = result.fileName;

  if (!scrambles.length) return;

  await batchProcess(scrambles, fileName); // 🚀 修改点 5：传入文件名
}

// ==================== 8️⃣ 执行 ====================
main();
