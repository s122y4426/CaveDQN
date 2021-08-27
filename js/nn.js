class Matrix {
  constructor(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.data = Array(this.rows)
      .fill()
      .map(() =>
        Array(this.cols)
          .fill()
          .map(() => Math.random())
      );
  }

  dot(a) {
    let result = new Matrix(this.rows, a.cols);
    if (this.cols == a.rows) {
      for (let i = 0; i < this.rows; i++) {
        for (let j = 0; j < a.cols; j++) {
          let sum = 0;
          for (let k = 0; k < this.cols; k++) {
            //console.log("i: ", i, " j: ", j, " k:", k);
            sum += this.data[i][k] * a.data[k][j];
          }
          result.data[i][j] = sum;
        }
      }
    }
    return result;
  }

  static transpose(matrix) {
    return new Matrix(matrix.cols, matrix.rows).map(
      (_, i, j) => matrix.data[j][i]
    );
  }

  map(func) {
    // Apply a function to every element of matrix
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        let val = this.data[i][j];
        this.data[i][j] = func(val, i, j);
      }
    }
    return this;
  }

  static map(matrix, func) {
    // Apply a function to every element of matrix
    return new Matrix(matrix.rows, matrix.cols).map((e, i, j) =>
      func(matrix.data[i][j], i, j)
    );
  }
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function ReLU(a) {
  let result = a.data[0].map(function (e) {
    return Math.max(e, 0);
  });
  a.data = [result];
  //return a.data
}

let x = new Matrix(1, 3);
x.data = [[1, 5, 0.5]];
x.data[0].push(1); //バイアス
let h1W = new Matrix(3, 4);
let oW = new Matrix(4, 2);
let z = 0;

// Hidden layer
h1out = x.dot(h1W);
ReLU(h1out);
console.log(h1out.data);

// Output layer
//z = h1out.dot(Matrix.transpose(oW));
//act = sigmoid(z.data[0]);
y = h1out.dot(oW);
console.log(y);

///////////////////////////////////////////////////////////////////////////////
///  学習
///////////////////////////////////////////////////////////////////////////////

// 正規化
// フーバー関数(とりあえずMSE)
oldQ = { x: 1, y: 1, z: 1 };
currentQ = nn(x, y, z);
nexta = getAct(currentQ);
if (true) {
  reward += 1;
}
maxQ = nn(x + 1, y + 1, z + 1);
target = reward + maxQ;
tdDif = 0.5 * (target - currentQ[nexta]) ** 2;

// function huber(tdDif) {
//   return Math.max(Math.sqrt(tdDif) / 2, Math.abs(tdDif - 0.5));
// }

// 誤差逆伝播
// 目的関数
dE = target - currentQ[nexta];

// 出力層
dh1out = oW * dE;
doW = h1out * dE;

// oWの更新
let a = 0.01;
oW = oW - a * doW;

// 隠れ層
function dReLU(x) {
  return x < 0 ? 0 : x;
}
dh1out = dReLU(dh1out);
dh1W = x * dh1out;

// H1Wの更新
h1W = h1W - a * dH1W;

// 報酬の設定

// 経験蓄積
// S+1でtargetQの作成
// SのDNN出力→誤差を元に回帰学習
