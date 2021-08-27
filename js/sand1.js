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
}

let tes = new Matrix(4, 1);
console.log(tes);

let main = new Matrix(4, 4);
console.log(main);

console.log(main.data[main.rows - 1]);
