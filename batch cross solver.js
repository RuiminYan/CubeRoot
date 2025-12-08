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

    const rows = Array.from(
      table.querySelectorAll("tbody tr, tr")
    ).slice(1);

    if (rows.length < expectedRows) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    // ✅ No 列必须出现 15
    const noValues = rows.map(r =>
      parseInt(r.children[noIdx]?.innerText.trim())
    ).filter(v => !isNaN(v));

    if (!noValues.includes(expectedRows)) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }

    // ✅ 目标列全部非空
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

  console.warn("⚠️ 等待表格短超时，进入持续等待模式");

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
  let round = 0;

  while (true) {
    round++;

    const tableInfo = await waitForTableComplete({
      timeout: shortWaitTimeout,
      expectedRows,
      columns
    });

    const values = readNumbersByColumns(tableInfo);
    const validCount = values.filter(v => v !== null).length;

    if (validCount === expectedTotal) {
      if (round > 1) console.log(`✅ 本条最终成功（重试 ${round - 1} 次）`);
      return values;
    }

    console.warn(`⚠️ 不完整 ${validCount}/${expectedTotal}，继续等待（第 ${round} 轮）`);
    await new Promise(r => setTimeout(r, pauseBetweenChecks));
  }
}

// ==================== 5️⃣ 批量处理（加入单条耗时统计） ====================
async function batchProcess(scrambles) {
  const input = document.querySelector("textarea");
  const analyzeBtn = [...document.querySelectorAll("button")]
    .find(b => b.innerText.toLowerCase().includes("analy"));

  if (!input || !analyzeBtn) {
    console.error("❌ 找不到 Scramble 输入框 或 Analyze 按钮");
    return;
  }

  const finalResults = [];

  for (let i = 0; i < scrambles.length; i++) {
    const sc = scrambles[i];

    // ✅ 记录开始时间
    const startTime = performance.now();

    input.value = sc;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    analyzeBtn.click();

    const values = await stableReadTable();

    // ✅ 记录结束时间
    const endTime = performance.now();
    const costMs = Math.round(endTime - startTime);       // 毫秒
    const costSec = (costMs / 1000).toFixed(3);           // 秒

    console.log(`${i + 1}/${scrambles.length} 用时 ${costSec} s`);

    finalResults.push({
      scramble: sc,
      time_ms: costMs,
      time_sec: costSec,
      values
    });
  }

  console.log("✅ 全部完成");
  exportToCSV(finalResults);
}

// ==================== 6️⃣ 导出 CSV（含时间列） ====================
function exportToCSV(data) {
  const header = ["scramble", "time_ms", "time_sec"];
  for (let i = 1; i <= 90; i++) header.push("v" + i);

  const rows = data.map(item => {
    return [
      item.scramble,
      item.time_ms,
      item.time_sec,
      ...item.values
    ];
  });

  const csv = [header, ...rows]
    .map(r => r.map(v => `"${v}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "scramble_results_with_time.csv";
  a.click();

  URL.revokeObjectURL(url);
  console.log("✅ CSV 已自动下载：scramble_results_with_time.csv");
}

// ==================== 7️⃣ 主入口 ====================
async function main() {
  const scrambles = await loadScramblesFromLocalFile();
  if (!scrambles.length) return;

  await batchProcess(scrambles);
}

// ==================== 8️⃣ 执行 ====================
main();
