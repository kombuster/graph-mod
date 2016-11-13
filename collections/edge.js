class Edge {
  constructor(node, data) {
    this.node = node;
    this.data = data;
    this.start = data.start;
    this.end = data.end;
  }
}

module.exports = Edge;