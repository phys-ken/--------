import { WebR } from 'https://webr.r-wasm.org/latest/webr.mjs';

const webR = new WebR({ interactive: false });
await webR.init();

const outElem = document.getElementById('out');
const rCodeElem = document.getElementById('r-code');
const runButton = document.getElementById('run-button');

let testdataRData = '';
let testdataRows = 0;

// 新しい要素: プロットを表示するコンテナとキャンバス要素
const plotContainer = document.createElement('div');
plotContainer.id = 'plot-container';
document.body.appendChild(plotContainer);
let canvas = null;

runButton.addEventListener('click', async () => {
  outElem.innerText = 'Rコードを実行中...';

  try {
    const rCode = `
testdata <- as.data.frame(matrix(c(${testdataRData}), nrow=${testdataRows}, byrow=TRUE))
${rCodeElem.value.trim()}
    `;

    // テキスト出力の処理
    const result = await webR.evalRString(rCode);
    outElem.innerText = result;

    // プロット表示のためのRデバイス設定
    await webR.evalRVoid('options(device=webr::canvas)');

    // プロット用のコンテナをクリア
    plotContainer.replaceChildren();

    // Rコードの実行
    await webR.evalRVoid(rCode);
    
  } catch (error) {
    console.error("Rコードの実行中にエラーが発生しました: ", error);
    outElem.innerText = 'エラーが発生しました: ' + error.message;
  }

  // プロット表示用の非同期ループ
  for (;;) {
    const output = await webR.read();
    switch (output.type) {
      case 'canvas':
        if (output.data.event === 'canvasImage') {
          // 画像データをキャンバスに描画
          canvas.getContext('2d').drawImage(output.data.image, 0, 0);
        } else if (output.data.event === 'canvasNewPage') {
          // 新しいキャンバス要素を作成
          canvas = document.createElement('canvas');
          canvas.setAttribute('width', '1008');
          canvas.setAttribute('height', '1008');
          
          // スタイルの設定
          canvas.style.width = "100%";      // 親要素の幅いっぱいに表示
          canvas.style.height = "auto";     // 高さは内容に応じて自動調整
          canvas.style.maxWidth = "700px";  // 最大幅を700pxに設定
          canvas.style.display = "block";   // 各プロットを縦に並べる

          // キャンバス要素をプロットコンテナに追加
          plotContainer.appendChild(canvas);
        }
        break;
      default:
        console.log(output);
    }
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
# クロンバックのα係数とトレースライン
webr::install("ltm")
library(ltm)
alpha <- cronbach.alpha(testdata)

# 合計点の計算
total_scores <- rowSums(testdata)

# サンプル数とオプション数
nSample <- nrow(testdata)
nOption <- ncol(testdata)

# オプション名の設定
OPTIONS <- paste0("O", 1:nOption)

# 生徒を合計点で3つのグループに分割
group_labels <- rep(2, nSample)  # 中間グループをデフォルトに設定
group_labels[order(total_scores)[1:floor(nSample/3)]] <- 1  # 低得点グループ
group_labels[order(total_scores, decreasing = TRUE)[1:floor(nSample/3)]] <- 3  # 高得点グループ

# グループごとに選択割合を計算
ioprop <- matrix(0, nrow=3, ncol=nOption)
for(j in 1:nOption) {
  ioprop[, j] <- tapply(testdata[, j], group_labels, mean, simplify = TRUE)
}

# 各設問ごとにプロットを作成
output <- capture.output({
print(alpha)
print("トレースラインを下部に表示します。横にスクロールしてください。")
  for(i in 1:nOption) {
    # 0のトレースラインを除外
    if (sum(ioprop[,i] != 0) > 0) {
      # プロットの作成
      plot(1:3, ioprop[,i], type="b", ylim=c(0,1), las=1,
           xlab="グループ", ylab="選択率", 
           main=paste("設問", i),
           col="black", pch=16, cex=2, xaxt='n', yaxt='n')

      # カスタム軸ラベル
      axis(1, at=c(1,2,3), labels=c("低群", "中群", "高群"), cex.axis=1.5)
      axis(2, at=seq(0, 1, by=0.2), labels=paste0(seq(0, 100, by=20), "%"), cex.axis=1.5)

      # 各点の上に割合を表示
      for(k in 1:3) {
        text(k, ioprop[k,i], labels=paste0(round(ioprop[k,i] * 100), "%"), pos=3, cex=1.5)
      }

      # 明示的にプロットを終了
      dev.off()
    }
  }
})

# 出力をまとめて表示
paste(output, collapse = "\n")


  `,
  sample2: `
# サンプルコード2
# Q3統計量(2PL)
# 必要なライブラリの読み込み
webr::install("subscore")
library(subscore)

# YenのQ3統計量の計算
q3_result <- Yen.Q3(testdata, IRT.model="2pl")

# Q3統計量行列の取得と表示
q3_matrix <- q3_result$Q3
q3_matrix_rounded <- round(q3_matrix, 3)

# 対角成分を0.2超えチェックから除外
q3_matrix_no_diag <- q3_matrix_rounded
diag(q3_matrix_no_diag) <- NA

# 0.2を超える組み合わせを全て列挙（対角成分は無視、ひっくり返したペアも無視）
over_0_2_indices <- which(q3_matrix_no_diag > 0.2, arr.ind = TRUE)
unique_pairs <- list()
pair_values <- list()

for (i in 1:nrow(over_0_2_indices)) {
  pair <- sort(over_0_2_indices[i,])
  if (!any(sapply(unique_pairs, function(x) all(x == pair)))) {
    unique_pairs <- append(unique_pairs, list(pair))
    pair_values <- append(pair_values, list(q3_matrix_rounded[pair[1], pair[2]]))
  }
}

# 組み合わせとQ3統計量をリスト形式で表示
output <- capture.output({
  cat("Q3統計量が0.2を超えた組み合わせ:\n")
  for (i in 1:length(unique_pairs)) {
    pair <- unique_pairs[[i]]
    cat("(", pair[1], ", ", pair[2], "): ", sprintf("%.2f", pair_values[[i]]), "\n", sep="")
  }
  
  cat("\nYenのQ3統計量行列:\n")
  print(format(q3_matrix_rounded, digits = 2, nsmall = 2))
})

# 結果の出力
paste(output, collapse = "\n")

  `,
  sample3: `
# サンプルコード3
# テトラコリック相関行列の固有値計算
webr::install("polycor")
library(polycor)

tetra_corr_matrix <- hetcor(testdata)$correlations
eigen_values <- eigen(tetra_corr_matrix)$values

# スクリープロットの描画
output <- capture.output({
cat("\nテトラコリック相関行列の固有値を計算しました。\n")
cat("\nスクリープロットが画面枠外に表示されます。しばらくお待ちください。")
plot(eigen_values, type = "b", pch = 19, xlab = "Component Number", 
       ylab = "Eigenvalue", main = "Scree Plot of Eigenvalues")
dev.off()
})
# 結果の出力
paste(output, collapse = "\n")
  `,
  sample4: `


  `
};

document.querySelectorAll('.sample-code-button').forEach(button => {
  button.addEventListener('click', () => {
    const codeKey = button.getAttribute('data-code');
    document.getElementById('r-code').value = sampleCodes[codeKey];
  });
});
