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

        console.log(`✅ 已加载 ${lines.length} 条打乱`);
        resolve(lines);
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

// ==================== 5️⃣ 批量处理（新增：每1000条写入并清空内存） ====================
async function batchProcess(scrambles) {
  const input = document.querySelector("textarea");
  const analyzeBtn = [...document.querySelectorAll("button")]
    .find(b => b.innerText.toLowerCase().includes("analy"));

  if (!input || !analyzeBtn) {
    console.error("❌ 找不到 Scramble 输入框 或 Analyze 按钮");
    return;
  }

  const finalResults = [];

  // === 新增 === 生成文件名（所有批次写入同一个文件，不覆盖）
  const now = new Date();
  const filenameTime = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}_` +
                       `${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}-${String(now.getSeconds()).padStart(2,'0')}`;
  const filename = `cross_stat_${filenameTime}.csv`;

  const totalStart = performance.now();

  for (let i = 0; i < scrambles.length; i++) {
    const sc = scrambles[i];

    const startTime = performance.now();

    input.value = sc;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    analyzeBtn.click();

    const values = await stableReadTable();

    const endTime = performance.now();
    const costMs = Math.round(endTime - startTime);
    const costSec = (costMs / 1000).toFixed(3);

    console.log(`${i + 1} / ${scrambles.length} 用时 ${costSec}s`);

    finalResults.push([
      sc,
      ...values
    ]);

    // ========== ⭐⭐⭐ 新增：每 1000 条写入然后清空 ==========  
    if ((i + 1) % 1000 === 0) {
      appendCSV_NoHeader(finalResults, filename);
      finalResults.length = 0; // 清空
      console.log(`💾 已写入 ${i + 1} 条（内存已释放）`);
    }
  }

  // 最后一批不足1000条
  if (finalResults.length > 0) {
    appendCSV_NoHeader(finalResults, filename);
    console.log(`💾 已写入全部 ${scrambles.length} 条`);
  }

  const totalEnd = performance.now();
  const totalSec = ((totalEnd - totalStart) / 1000).toFixed(3);

  const finishTime =
    `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ` +
    `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;

  console.log(`⏰ 完成时间：${finishTime}, 总用时：${totalSec}s`);
}

// ==================== 6️⃣ 追加写入 CSV（无表头） ====================
function appendCSV_NoHeader(rows, filename) {
  const csv = rows
    .map(r => r.map(v => `${v}`).join(","))
    .join("\n");

  const blob = new Blob([csv + "\n"], { type: "text/csv;charset=utf-8;" });
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
