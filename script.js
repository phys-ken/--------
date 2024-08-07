async function processFile() {
  const fileInput = document.getElementById('upload');
  if (fileInput.files.length === 0) {
      alert('ファイルを選択してください');
      return;
  }

  const file = fileInput.files[0];
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  // タイムスタンプの生成
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

  // シートのコピーと前処理
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonSheet = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // J列以降かつ2行目以降の全データに対して置換処理
  for (let i = 1; i < jsonSheet.length; i++) {
      for (let j = 9; j < jsonSheet[i].length; j++) {
          jsonSheet[i][j] = jsonSheet[i][j] === 0 ? 0 : 1;
      }
  }

  // 1_CTT_ResponseData.xlsx の処理
  const responseDataSheet = JSON.parse(JSON.stringify(jsonSheet)); // コピーを作成
  responseDataSheet.forEach(row => row.splice(8, 1)); // I列を削除
  responseDataSheet.forEach((row, index) => {
      if (index === 0) {
          row.unshift("No");
      } else {
          row.unshift(`s${String(index).padStart(4, '0')}`);
      }
  });

  const responseDataWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(responseDataWorkbook, XLSX.utils.aoa_to_sheet(responseDataSheet), 'Sheet1');

  // 2_CTT_AnswerKey.xlsx の処理
  const answerKeySheet = JSON.parse(JSON.stringify(jsonSheet)); // コピーを作成
  answerKeySheet.forEach(row => row.splice(0, 9)); // A列からI列を削除
  answerKeySheet.splice(2); // 3行目以降を削除
  if (answerKeySheet.length > 1) {
      const columnsCount = answerKeySheet[0].length;
      answerKeySheet[1] = Array(columnsCount).fill(1); // 2行目のデータをすべて1にする
  }
  answerKeySheet[0].unshift("正答キー");
  answerKeySheet[1].unshift("項目分析システム");

  const answerKeyWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(answerKeyWorkbook, XLSX.utils.aoa_to_sheet(answerKeySheet), 'Sheet1');

  // 3_Exametrika_binary.xlsx の処理
  const binarySheet = JSON.parse(JSON.stringify(jsonSheet)); // コピーを作成
  binarySheet.forEach(row => {
      const columnsToDelete = [0, 1, 2, 4, 5, 6, 8];
      columnsToDelete.reverse().forEach(col => row.splice(col, 1)); // 指定された列を削除
  });

  const binaryWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(binaryWorkbook, XLSX.utils.aoa_to_sheet(binarySheet), 'Sheet1');

  // ダウンロードリンクの作成
  createDownloadLink(responseDataWorkbook, `1_CTT_ResponseData_${timestamp}.xlsx`, 'downloadLink1');
  createDownloadLink(answerKeyWorkbook, `2_CTT_AnswerKey_${timestamp}.xlsx`, 'downloadLink2');
  createDownloadLink(binaryWorkbook, `3_Exametrika_binary_${timestamp}.xlsx`, 'downloadLink3');
}

function createDownloadLink(workbook, filename, linkId) {
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const downloadLink = document.getElementById(linkId);
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = filename;
  downloadLink.style.display = 'block';
  downloadLink.textContent = filename + ' ダウンロード';
}
