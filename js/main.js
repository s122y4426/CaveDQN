"use strict";
let y = 250, //自機位置
  v = 0, // 自機速度
  keyDown = false,
  WALLS = 80,
  score = 0;
let walls = [],
  slope = 0, //勾配度合い
  timer,
  ship, // 自機obj
  main; // 洞窟obj

function NN(y, v, wall_t, wall_b) {}

function getAct() {
  let val = Math.random();
  if (val < 0.5) {
    keyDown = !keyDown;
  }
  console.log("keyDown: ", keyDown, " Rand: ", val);
}

function init() {
  main = document.getElementById("main");
  console.log("main: ", main);
  //ship = document.getElementById("ship");
  ship = { style: { top: 250, height: 97 } };

  for (let i = 0; i < WALLS; i++) {
    walls[i] = document.createElement("div");
    walls[i].style.position = "absolute";
    walls[i].style.top = "100px";
    walls[i].style.left = i * 10 + "px";
    walls[i].style.width = "10px";
    walls[i].style.height = "400px";
    walls[i].style.backgroundColor = "#333333";
    main.appendChild(walls[i]);
  }

  slope = Math.floor(Math.random() * 5) + 1;
  timer = setInterval(mainloop, 50);
  window.addEventListener("keydown", function () {
    keyDown = true;
  });
  window.addEventListener("keyup", function () {
    keyDown = false;
  });
}

function hitTest() {
  let st = parseInt(ship.style.top) + 10;
  let sh = parseInt(ship.style.height);
  let sb = st + sh - 20;

  let wt = parseInt(walls[14].style.top);
  let wh = parseInt(walls[14].style.height);
  let wb = wh + wt;

  return st < wt || sb > wb;
}

///////////////////////////////////////////////////////////////////////////////
///  メインループ
///////////////////////////////////////////////////////////////////////////////
function mainloop() {
  console.log("-------------------------");
  console.count("mainloop");
  console.log(
    "y: ",
    y,
    " v: ",
    v,
    " wall_t: ",
    parseInt(walls[14].style.top),
    " wall_b: ",
    parseInt(walls[14].style.top) + parseInt(walls[14].style.height)
  );
  console.log("ship:", "top", ship.style.top, " height: ", ship.style.height);
  if (hitTest()) {
    clearInterval(timer);
    document.getElementById("bang").style.top = y - 40 + "px";
    //document.getElementById("bang").style.visibility = "visible";
    return;
  }

  getAct();

  score += 10;
  document.getElementById("score").innerHTML = score.toString();

  v += keyDown ? -3 : 3;
  y += v;
  ship.style.top = y + "px";

  let edge = walls[WALLS - 1].style;
  let t = parseInt(edge.top);
  let h = parseInt(edge.height);
  let b = h + t;
  t += slope;
  b += slope;
  if ((t < 0 && slope < 0) || (b > 600 && slope > 0)) {
    console.log("衝突");
    slope = (Math.floor(Math.random() * 5) + 1) * (slope < 0 ? 1 : -1);
    edge.top = t + 10 + "px";
    edge.height = h - 20 + "px";
  } else {
    edge.top = t + "px";
  }

  console.log("slope: ", slope);

  for (let i = 0; i < WALLS - 1; i++) {
    walls[i].style.top = walls[i + 1].style.top;
    walls[i].style.height = walls[i + 1].style.height;
  }
}
