import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';

const webR = new WebR({ interactive: false });
await webR.init();

const outElem = document.getElementById('out');
const rCodeElem = document.getElementById('r-code');
const runButton = document.getElementById('run-button');

let testdataRData = '';
let testdataRows = 0;

runButton.addEventListener('click', async () => {
  outElem.innerText = 'Rコードを実行中...(このままお待ちください。エラー時にはエラーと表示されます。)';

  try {
    const rCode = `
testdata <- as.data.frame(matrix(c(${testdataRData}), nrow=${testdataRows}, byrow=TRUE))
${rCodeElem.value.trim()}
    `;
    const result = await webR.evalRString(rCode);

    // 結果を表示
    outElem.innerText = result;
  } catch (error) {
    console.error("Rコードの実行中にエラーが発生しました: ", error);
    outElem.innerText = 'エラーが発生しました: ' + error.message;
  }
});

document.getElementById('process-button').addEventListener('click', async () => {
  const fileInput = document.getElementById('upload');
  if (fileInput.files.length === 0) {
    alert('ファイルを選択してください');
    return;
  }

  const file = fileInput.files[0];
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonSheet = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const processedData = jsonSheet.map((row, index) => {
    if (index === 0) {
      return ['ID', ...row.slice(2)];  // 1行目は見出し行
    } else {
      return [`${row[0]}-${row[1]}`, ...row.slice(2)];  // 1列目と2列目を結合してID列を作成
    }
  });

  const totalRows = processedData.length - 1;
  const totalColumns = processedData[0].length - 1;
  const infoText = `受験者${totalRows}人、設問${totalColumns}問\n先頭の10行10列のみ表示`;
  document.getElementById('data-info').innerText = infoText;

  const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
  tableBody.innerHTML = '';

  processedData.slice(0, 11).forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    row.slice(0, 11).forEach((cell, cellIndex) => {
      const td = document.createElement('td');
      td.textContent = cell;
      if (rowIndex === 0 || cellIndex === 0) {
        td.classList.add('highlight');
      }
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });

  // 全データをRに渡すために、R用のデータフォーマットを生成
  testdataRData = processedData.slice(1).map(row => row.slice(1).join(", ")).join(", ");
  testdataRows = totalRows;
});


document.getElementById('templatedownloadBtn_exmk').addEventListener('click', function () {
  // データの生成
  const data = [
    ["生徒ID", "Name", "Q001", "Q002", "Q003", "Q004", "Q005", "Q006", "Q007", "Q008", "Q009", "Q010"],
    ["S001", "サンプル一郎", 0, 1, 1, 0, 1, 1, 0, 0, 0, 0],
    ["S002", "サンプル次郎", 1, 1, 1, 1, 0, 1, 1, 0, 0, 1]
  ];

  // ワークブックとワークシートの作成
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // ファイルの生成とダウンロード
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);

  // ダウンロードリンクの作成
  const a = document.createElement('a');
  a.href = url;
  a.download = 'テンプレート_webredu.xlsx';
  document.body.appendChild(a);
  a.click();

  // リソースの解放
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
});

// 実行結果をテキストファイルとして保存するボタンの処理
const saveButton = document.getElementById('save-button');
saveButton.addEventListener('click', () => {
  const text = outElem.innerText;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'result.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
});


// サンプルコードの登録 (script.js の最後尾に追加)
const sampleCodes = {
  sample1: `
# サンプルコード1
# クロンバックのα係数
webr::install("ltm")
library(ltm)
alpha <- cronbach.alpha(testdata)

# 結果の表示
output <- capture.output({
    cat("\nクロンバックのα係数:\n")
    print(alpha)
})
paste(output, collapse = "\n")

  `,
  sample2: `
# サンプルコード2
# Q3統計量(2PL)
webr::install("subscore")
library(subscore)
q3_result <- Yen.Q3(testdata, IRT.model="2pl")

# 結果の表示
output <- capture.output({
    cat("\nYenのQ3統計量:\n")
    print(q3_result$Q3)
})

paste(output, collapse = "\n")
  `,
  sample3: `
# サンプルコード3
# テトラコリック相関行列の固有値
webr::install("polycor")
library(polycor)
tetra_corr_matrix <- hetcor(testdata)$correlations
eigen_values <- eigen(tetra_corr_matrix)$values
# 結果の表示
output <- capture.output({
    cat("\n固有値（スクリープロット用）:\n")
    print(eigen_values)
})
paste(output, collapse = "\n")

  `,
  sample4: `
# テンプレート
webr::install("ltm") #ライブラリのインストール
library(ltm)

# 結果の表示
output <- capture.output({
###この中にprintやcatを表示###




####ここまで###
})
paste(output, collapse = "\n")
  `
};

document.querySelectorAll('.sample-code-button').forEach(button => {
  button.addEventListener('click', () => {
    const codeKey = button.getAttribute('data-code');
    document.getElementById('r-code').value = sampleCodes[codeKey];
  });
});