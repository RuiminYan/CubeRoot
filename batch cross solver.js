// https://or18.github.io/RubiksSolverDemo/
// Show Analyzer, 全选Face Option
// 从None列到x列共6列，15行，输出里面的所有内容，按列取内容,共90个值
// Chrome按F12进入控制台输入以下内容

// ==================== 1️⃣ 选择 scrambles.txt 并读取 ====================
function loadScramblesFromLocalFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";

    input.onchange = () => {
      const file = input.files[0];
      if (!file) return reject("未选择文件");

      const reader = new FileReader();
      reader.onload = () => {
        const lines = reader.result.split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l);

        console.log(`✅ 已加载 ${lines.length} 条记录（含编号 + 打乱）`);

        // 解析成 { id, scramble }
        const parsed = lines.map(l => {
          const parts = l.split(",");
          return {
            id: parts[0].trim(),
            scramble: parts[1].trim()
          };
        });

        resolve(parsed);
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
    ? Array.from(table.querySelectorAll("tbody tr, tr")).slice(1, 16)
    : [];

  return { table, headerCells, colIndices, rows };
}

// ==================== 3️⃣ 按“列优先”读取 90 个数 ====================
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

// ==================== 4️⃣ 永久等待直到完整读到 90 个数 ====================
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

// ==================== 5️⃣ 批量处理（仅输出编号 + 90列） ====================
async function batchProcess(scrambles) {
    const input = document.querySelector("textarea");
    const analyzeBtn = [...document.querySelectorAll("button")]
      .find(b => b.innerText.toLowerCase().includes("analy"));

    if (!input || !analyzeBtn) {
        console.error("❌ 找不到 Scramble 输入框 或 Analyze 按钮");
        return;
    }

    const baseName = prompt("请输入导出的文件名称（无需扩展名）:", "cross_stat");
    if (!baseName) {
        console.error("❌ 未输入名称，已取消");
        return;
    }

    let csvBuffer = "";
    let processed = 0;
    let filePart = 1;

    const globalStart = performance.now();

    for (let i = 0; i < scrambles.length; i++) {
        const { id, scramble } = scrambles[i];

        const t0 = performance.now();

        // 1. 同步操作：输入打乱步骤
        input.value = scramble;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        
        // 2. 同步操作：点击分析按钮，触发计算
        analyzeBtn.click();

        // 🟢 延迟 1 (50ms): 防御性延迟，确保点击事件处理完毕并启动网站的异步计算任务
        await new Promise(r => setTimeout(r, 50)); 
        
        // 3. 核心等待：等待表格数据完全加载（包含长时间轮询）
        const values = await stableReadTable();

        const t1 = performance.now();
        const costSec = ((t1 - t0) / 1000).toFixed(3);

        console.log(`${i + 1} / ${scrambles.length} 用时 ${costSec}s`);

        // ⚠️ 最终要求：只输出「编号 + 90列」
        csvBuffer += `${id},${values.join(",")}\n`;

        processed++;

        if (processed % 2000 === 0 || i === scrambles.length - 1) {
            const partFilename = `${baseName}_part${filePart}.csv`;
            downloadCSVBuffer(csvBuffer, partFilename);
            console.log(`💾 已生成 ${partFilename}，释放内存`);
            csvBuffer = "";
            filePart++;
        }
        
        // 🟢 延迟 2 (100ms)：循环间歇休息，缓解浏览器在批量处理时的压力
        if (i < scrambles.length - 1) { 
             await new Promise(r => setTimeout(r, 100)); 
        }
    }

    const globalEnd = performance.now();
    const totalSec = ((globalEnd - globalStart) / 1000).toFixed(3);
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
  const scrambles = await loadScramblesFromLocalFile();
  if (!scrambles.length) return;

  await batchProcess(scrambles);
}

// ==================== 8️⃣ 执行 ====================
main();
