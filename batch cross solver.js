// https://or18.github.io/RubiksSolverDemo/
// Show Analyzer, 全选Face Option
// 从None列到x列共6列，15行，输出里面的所有内容，按列取内容,共90个值
// ==================== 1️⃣ 选择本地文件并读取内容 ====================
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
        const lines = reader.result.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        console.log(`✅ 已加载 ${lines.length} 条打乱`);
        resolve(lines);
      };
      reader.onerror = () => reject("读取文件出错");
      reader.readAsText(file);
    };

    input.click();
  });
}

// ==================== 2️⃣ 智能等待表格加载完成 ====================
async function waitForTableComplete(timeout = 10000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const table = document.querySelector("table");
    if (!table) { await new Promise(r => setTimeout(r, 200)); continue; }

    const headerCells = Array.from(table.querySelectorAll("thead th, tr:first-child th, tr:first-child td"));
    const noIdx = headerCells.findIndex(th => th.innerText.trim() === "No");
    if (noIdx === -1) { await new Promise(r => setTimeout(r, 200)); continue; }

    const rows = Array.from(table.querySelectorAll("tbody tr, tr")).slice(1);
    const noValues = rows.map(r => parseInt(r.children[noIdx]?.innerText.trim())).filter(v => !isNaN(v));
    if (noValues.includes(15)) return table;

    await new Promise(r => setTimeout(r, 200));
  }

  console.warn("⚠️ 等待表格超时，仍然继续读取");
  return document.querySelector("table");
}

// ==================== 3️⃣ 按列提取数字 ====================
function getNumbersByColumnTable(table, columns = ["None","z2","z'","z","x'","x"]) {
  if (!table) { console.error("❌ 没有找到 table"); return []; }

  const headerCells = Array.from(table.querySelectorAll("thead th, tr:first-child th, tr:first-child td"));
  const colIndices = columns.map(colName => {
    const idx = headerCells.findIndex(th => th.innerText.trim() === colName);
    if (idx === -1) console.warn(`⚠️ 未找到列: ${colName}`);
    return idx;
  });

  const rows = Array.from(table.querySelectorAll("tbody tr, tr")).slice(1);
  const result = [];

  colIndices.forEach(colIdx => {
    if (colIdx === -1) return;
    rows.forEach(row => {
      const cell = row.children[colIdx];
      if (!cell) return;
      const val = parseInt(cell.innerText.trim());
      if (!isNaN(val)) result.push(val);
    });
  });

  return result;
}

// ==================== 4️⃣ 导出 CSV ====================
function exportToCSV(data, filename = "results.csv") {
  if (!data || !data.length) { console.warn("⚠️ 没有数据导出"); return; }

  // CSV 每行格式: Scramble, 数字1, 数字2, ...
  const csvContent = data.map(item => [item.scramble, ...item.numbers].join(",")).join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  console.log(`✅ CSV 文件已生成: ${filename}`);
}

// ==================== 5️⃣ 批量分析 Scramble ====================
async function batchAnalyzeScrambles(scrambles) {
  const input = document.querySelector("textarea");
  const analyzeBtn = [...document.querySelectorAll("button")].find(b => b.innerText.toLowerCase().includes("analy"));
  if (!input || !analyzeBtn) { console.error("❌ 找不到 Scramble 输入框 或 Analyze 按钮"); return; }

  const results = [];

  for (let i = 0; i < scrambles.length; i++) {
    const sc = scrambles[i];
    console.log(`▶ 正在分析第 ${i + 1} 条 / 共 ${scrambles.length}`);
    console.log("Scramble:", sc);

    input.value = sc;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    analyzeBtn.click();

    const table = await waitForTableComplete(10000);
    const numbers = getNumbersByColumnTable(table, ["None","z2","z'","z","x'","x"]);

    results.push({ scramble: sc, numbers });
    console.log(`✅ 第 ${i + 1} 条完成`, numbers);
  }

  console.log("✅ ✅ ✅ 全部完成，最终结果：");
  console.table(results);

  exportToCSV(results, "rubiks_results.csv");

  return results;
}

// ==================== 6️⃣ 主函数 ====================
async function main() {
  const scrambles = await loadScramblesFromLocalFile(); // 弹出文件选择
  if (!scrambles.length) return;
  await batchAnalyzeScrambles(scrambles);
}

// ==================== 7️⃣ 执行 ====================
main();
