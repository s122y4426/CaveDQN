"use strict";
var fs = require("fs");
var text = 0;

let y = 250, //自機位置
  v = 0, // 自機速度
  keyDown = false,
  WALLS = 80,
  score = 0,
  scores = [];
let walls = [],
  wall_t, // 壁の天井y座標
  wall_b, // 壁の底のy座標
  slope = 0, //勾配度合い
  timer,
  ship, // 自機obj
  sMargin = 20, // 自機画像下側の余裕
  main; // 洞窟obj
let currentState; // 自機及び壁の状態管理
let numberOfFrames = 0;

///////////////////////////////////////////////////////////////////////////////
///  ニューラルネット用関数
///////////////////////////////////////////////////////////////////////////////
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

function dReLU(_list) {
  return _list.map((x) => (x < 0 ? 0 : x));
}

function getAct() {
  let val = Math.random();
  return val < 0.5 ? 1 : 0;
}

///////////////////////////////////////////////////////////////////////////////
///  ゲーム用関数
///////////////////////////////////////////////////////////////////////////////
function init() {
  return new Promise((resolve) => {
    console.count("init()");
    //main = document.getElementById("main");
    // main = [];
    //ship = document.getElementById("ship");
    ship = { style: { top: 250, height: 97 } };
    y = ship.style.top;
    v = 0;
    score = 0;

    for (let i = 0; i < WALLS; i++) {
      walls[i] = {
        style: {
          //  position: "",
          top: "",
          left: "",
          width: "",
          height: "",
          //    backgroundColor: "",
          bottom: "",
        },
      };
      //  walls[i].style.position = "absolute";
      walls[i].style.top = 100;
      walls[i].style.left = i * 10;
      walls[i].style.width = 10;
      walls[i].style.height = 400;
      //walls[i].style.backgroundColor = "#333333";
      walls[i].style.bottom = walls[i].style.top + walls[i].style.height;
      //main.push(walls[i]);
    }
    // 自機・速度・壁[14]の初期位置格納
    currentState = {
      shipT: ship.style.top,
      shipH: ship.style.height,
      shipV: v,
      wallT: walls[14].style.top,
      wallB: walls[14].style.bottom,
    };

    slope = Math.floor(Math.random() * 5) + 1;
    resolve();
  });
}

// ゲームオーバー判定
function hitTest() {
  let st = parseInt(ship.style.top) + 10;
  let sh = parseInt(ship.style.height);
  let sb = st + sh - sMargin;

  let wt = parseInt(walls[14].style.top);
  let wh = parseInt(walls[14].style.height);
  let wb = wh + wt;

  console.log(
    "st: ",
    st,
    "sh: ",
    sh,
    "sb: ",
    sb,
    "wt: ",
    wt,
    "wh: ",
    wh,
    "wb: ",
    wb
  );

  return st < wt || sb > wb;
}

// NNネットワーク作成
let x = new Matrix(1, 5);
let h1W = new Matrix(5, 15);
let h1B = new Matrix(1, 15);
let h2W = new Matrix(15, 5);
let h2B = new Matrix(1, 5);
let oW = new Matrix(5, 2);
let oB = new Matrix(1, 2);
let h1out = [];
let h2out = [];
let outY = [];
let currentQ = [0, 0];
let nextQ = [0, 0];
let err = 0;
let a = 0;
let maxA = 0;
let prevA = 0;
let nextA = 0;
let reward = 0;
let epsilon = 0.5;
let gamma = 0.99;

// 各重みの最後にバイアス追加
h1W.data.push(h1B.data[0]);
h2W.data.push(h2B.data[0]);
oW.data.push(oB.data[0]);

// 正規化
function norm(_list) {
  return _list.map((v) => v / _list.reduce((a, b) => a + b));
}

// 行動決定関数
function Q(state) {
  // input
  x.data = [
    norm([state.shipT, state.shipH, state.shipV, state.wallT, state.wallB]),
  ];
  x.data[0].push(1); //バイアス

  // Hidden layer1
  h1W.data[h1W.rows - 1] = h1B.data[0]; //更新したバイアス
  //("h1W: ", h1W);
  h1out = x.dot(h1W);
  //console.log("h1out: ", h1out);
  ReLU(h1out);
  h1out.data[0].push(1); //バイアス

  // Hidden layer2
  h2W.data[h2W.rows - 1] = h2B.data[0]; //更新したバイアス
  h2out = h2W.dot(h1out);
  //console.log("h1out: ", h1out);
  ReLU(h2out);
  h2out.data[0].push(1); //バイアス

  // Output layer
  oW.data[oW.rows - 1] = oB.data[0]; //更新したバイアス
  outY = h2out.dot(oW);
  console.log("outY: ", outY.data);
  return outY.data[0];
}

// 報酬計算：自機と壁の絶対距離
function getReward(prevState, currentState) {
  // 自機トップと壁上部の距離
  let currentDistanceToWallT = Math.abs(
    currentState.wallT - currentState.shipT
  );
  // 自機底と壁下部の距離
  let currentDistanceToWallB = Math.abs(
    currentState.wallB - (currentState.shipT + currentState.shipH - sMargin)
  );
  // 上記2つの差：　真ん中に近いほど良い、という解釈
  let currentDif = Math.abs(currentDistanceToWallT - currentDistanceToWallB);
  console.log("currentDif: ", currentDif);

  let prevDistanceToWallT = Math.abs(prevState.wallT - prevState.shipT);
  let prevDistanceToWallB = Math.abs(
    prevState.wallB - (prevState.shipT + prevState.shipH - sMargin)
  );
  let prevDif = Math.abs(prevDistanceToWallT - prevDistanceToWallB);
  console.log("prevDif: ", prevDif);
  // 前状態より現在の方が真ん中に近ければ+1
  return currentDif < prevDif ? 2 : -2;
}

// 次の行動の決定
function maxIndex(a) {
  return a.indexOf(Math.max(...a));
}

// εグリーディー法による行動選択
function epsilonGreedy(count, maxA) {
  // ランダム値がε以下ならランダム行動
  epsilon = 1 / (1 + count) ** 0.4;
  return Math.random() < epsilon ? Math.floor(Math.random() * 2) : maxA;
}

///////////////////////////////////////////////////////////////////////////////
///  メインループ
///////////////////////////////////////////////////////////////////////////////
// let x = new Matrix(1, 5);
// let h1W = new Matrix(6, 15);
// let h2W = new Matrix(15, 5);
// let oW = new Matrix(6, 2);
let dE;
let doW = new Matrix(5, 2);
let doX = new Matrix(5, 1);
let dh2out = new Matrix(5, 1); //TODO なぜ縦ベクトルにしてるんだ。横ベクトルに直そう
let dh2X = new Matrix(5, 1);
let dh2W = new Matrix(15, 5);
let dh1out = new Matrix(15, 1);
let dh1W = new Matrix(5, 15);
let eta = 0.0001;
let count = 0;

function mainloop() {
  return new Promise((resolve) => {
    while (numberOfFrames < 1000) {
      let prevState = Object.assign({}, currentState);
      console.log("-------------------------");
      console.log("mainloop: ", numberOfFrames + 1);
      console.log("prevState: ", prevState);
      // 状態sのQ値算出
      prevA = a;
      currentQ = nextQ.slice();

      // 次の行動及びQmaxの決定
      wall_t = walls[14].style.top;
      wall_b = walls[14].style.bottom;
      nextQ = Q(prevState);
      maxA = maxIndex(nextQ);
      a = epsilonGreedy(count, maxA);
      console.log("Actual_Action: ", a);
      //document.getElementById("score").innerHTML = score.toString();

      v += a ? -3 : 3;
      y += v;
      ship.style.top = y;

      // 壁の書き換え
      let edge = walls[WALLS - 1].style;
      let t = parseInt(edge.top);
      let h = parseInt(edge.height);
      let b = h + t;
      t += slope;
      b += slope;
      if ((t < 0 && slope < 0) || (b > 600 && slope > 0)) {
        slope = (Math.floor(Math.random() * 5) + 1) * (slope < 0 ? 1 : -1);
        edge.top = t + 10;
        edge.height = h - 20;
      } else {
        edge.top = t;
      }

      console.log("slope: ", slope);
      console.log("edge:", edge);

      for (let i = 0; i < WALLS - 1; i++) {
        walls[i].style.top = walls[i + 1].style.top;
        walls[i].style.height = walls[i + 1].style.height;
        walls[i].style.bottom =
          walls[i + 1].style.top + walls[i + 1].style.height;
      }
      walls[WALLS - 1].style.bottom =
        walls[WALLS - 1].style.top + walls[WALLS - 1].style.height;

      currentState = {
        shipT: ship.style.top,
        shipH: ship.style.height,
        shipV: v,
        wallT: walls[14].style.top,
        wallB: walls[14].style.bottom,
      };

      reward = getReward(prevState, currentState);
      console.log("reward:", reward);

      //ヒットしてたら終わり;
      if (hitTest()) {
        console.log("!!衝突!!");
        break;
      }

      score += 10;

      console.log("currentQ: ", currentQ);
      console.log("nextQ: ", nextQ);

      // MSE
      err = 0.5 * (reward + nextQ[maxA] - currentQ[prevA]) ** 2;
      console.log("err: ", err);

      //---------------------------------------------------------------------------------------------------------------------------------------------------------
      // 学習　微分パート
      console.log("-----学習----");
      dE = currentQ[a] - (reward + gamma * nextQ[maxA]);

      // 書き込み（収束確認用）
      text = epoch_count + "," + numberOfFrames + "," + dE + "\n";
      try {
        fs.appendFileSync("テストoutput2.txt", text);
        console.log("write end");
      } catch (e) {
        console.log(e);
      }

      // 出力層oW（順入力x * 逆伝播d）
      for (let i = 0; i < oW.row; i++) {
        doW.data[i][a] = h2out.data[i][a] * dE;
      }

      // 出力層doX
      for (let i = 0; i < h2out.length; i++) {
        doX.data[0][i] = oW.data[i][a] * dE;
      }

      // 活性化関数の微分
      dh2out.data[0] = dReLU(doX.data[0]);

      // hidden2 dh2W
      //console.log("dh2W:", dh2W);
      //console.log("h1out:", h1out);
      for (let i = 0; i < h2W.rows; i++) {
        for (let j = 0; j < h2W.cols; j++) {
          dh2W.data[j][i] = dh2out.data[j] * h1out.data[0][i]; // 逆伝播 x 順伝播入力
        }
      }

      // hidden2のdX
      for (let i = 0; i < h2W.cols; i++) {
        for (let j = 0; j < h2W.rows; j++) {
          //console.log("i: ", i, " j: ", j);
          dh2X.data[0][i] += h2W.data[j][i] * dh2out.data[0][j];
        }
      }

      // 活性化関数の微分
      dh1out.data[0] = dReLU(dh2out.data[0]);

      // hidden1 dh1W
      //console.log("dh1out:", dh1out);
      //console.log("dh1W:", dh1W);
      for (let i = 0; i < h1W.rows; i++) {
        for (let j = 0; j < h1W.cols; j++) {
          //console.log("i: ", i, " j: ", j);
          dh1W.data[i][j] = dh1out.data[j] * x.data[0][i];
        }
      }

      //---------------------------------------------------------------------------------------------------------------------------------------------------------
      // 学習　更新パート

      // 出力層Wの更新
      for (let i = 0; i < oW.rows; i++) {
        oW.data[i][a] -= eta * doW.data[i][a];
      }

      // 出力層oBの更新
      for (let i = 0; i < oB.rows; i++) {
        oB.data[i][a] -= eta * dE;
      }

      //隠れ層hidden2Wの更新
      for (let i = 0; i < h2W.rows; i++) {
        for (let j = 0; j < h2W.cols; j++) {
          h2W.data[i][j] -= eta * dh2W.data[i][j];
        }
      }

      //隠れ層hidden2Bの更新
      for (let i = 0; i < h2B.cols; i++) {
        h2B.data[0][i] -= eta * dh2out.data[i];
      }

      //隠れ層hidden1Wの更新
      for (let i = 0; i < h1W.rows; i++) {
        for (let j = 0; j < h1W.cols; j++) {
          h1W.data[i][j] -= eta * dh1W.data[i][j];
        }
      }

      //隠れ層hidden1Bの更新
      for (let i = 0; i < h1B.cols; i++) {
        h1B.data[0][i] -= eta * dh1out.data[i];
      }

      numberOfFrames++;
    }
    numberOfFrames = 0;
    scores.push(score);
    count++; // for εグリーディー法
    resolve();
  });
}

///////////////////////////////////////////////////////////////////////////////
///  RUN
///////////////////////////////////////////////////////////////////////////////
let epoch_count = 0;
async function run() {
  for (let i = 0; i < 10000; i++) {
    epoch_count = i;
    await init();
    await mainloop();
    if (err < 0.001) {
      console.log("Converged");
      break;
    }
    console.log(
      "============================================================="
    );
  }
  console.table(oW.data);
  console.table(h2W.data);
  console.table(h1W.data);
  console.log("BestScore: ", Math.max(...scores));
}

run();

//TODO
// 0.wallBottom変わらない問題 ○
// 1.入力を変える　自機下部の情報も入れる ○
// 収束したら終了する条件を入れる　○
// 2.NN層を増やす　○
// 3.フーバー関数を導入
// 4.バイアスの追加　○
// 5.Trainボタンの実装
// 6.経験蓄積
// リワードの変更 1→10でちょっと改善？→やっぱだめWがやたら大きくなる
// doXの誤差逆伝播、もう一つの出力も加味する必要あり？
