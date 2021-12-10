function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

class Client {
  constructor(config) {
    this.config = config;
    this.entries = [];
    this.byId = {};
  }
  start() {
    // set up networking, make a connection to remote service
  }

  status() {
    return new Promise((res, rej) => {
      res({ ok: true });
    });
  }
  fetchData() {
    // generate data locally for now
    return new Promise((res, rej) => {
      for(let suit of "♥♠♣♦") {
        for (let value of ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]) {
          let entry = { id: value+suit, value, suit, index: this.entries.length };
          this.entries.push(entry);
          this.byId[entry.id] = entry;
        }
      }
      shuffleArray(this.entries);
      setTimeout(() => res(this.entries), 60);
    });
  }
  updateData({ id, action }) {
    return new Promise((res, rej) => {
      console.log("updateData: ", id, action);

      let entry = this.byId[id];
      if (!entry) {
        console.warn("Erg, no such card:", id);
        res();
      }
      switch (action) {
        case "remove":
          this.entries.splice(entry.index, 1);
          delete this.byId[id];
          console.log("removed card:", entry, "remaining:", this.entries.length);
          break;
      }
      res({ id });
    });
  }
}

