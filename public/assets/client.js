import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  getDocs,
  where
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

class Store {
  constructor(config) {
    this._items = [];
    this._byId = new Map();
  }
  query(params) {
    const result = this._rows.filter(item => {
      return item;
    });
    return new Promise(res => {
      setTimeout(() => res(result), 60);
    });
  }
  update(itemAction) {
    let id = itemAction.id;
    let result = { added: [], removed: [], status: [] };
    switch (itemAction.action) {
      case "remove":
        let idx = this._items.findIndex(item => item.id == id);
        this._items.splice(idx, 1);
        delete this._byId[id];
        result.removed.push({ id });
        break;
      case "add": {
        let entry = Object.assign({}, itemAction.data);
        let idx = this._items.findIndex(item => item.id == id);
        this._items.push(entry);
        this._byId[entry.id] = entry;
        result.added.push(entry);
        break;
      }
      case "update": {
        let entry = this._byId[id];
        Object.assign(entry, data);
        result.status.push(Object.assign({}, entry));
        break;
      }
    }
    return new Promise(res => {
      setTimeout(() => res(Object.assign(result, { status: "ok" })), 60);
    });
  }
  notify(topic, data) {
    const event = new CustomEvent(topic, {
      detail: data
    });
    document.dispatchEvent(event);
  }
}

let _clientInstance;
let _fakeclientInstance;

class Client {
  constructor(config) {
    this.config = config;
    this.entries = [];
    this.byId = {};
    this._topics = new Set();
    this.error = null;
  }
  static getInstance(config) {
    if (!_clientInstance) {
      _clientInstance = new Client(config);
    }
    return _clientInstance;
  }
  async initialize() {
    if (this._initialized) {
      return;
    }
    this.firebaseApp = initializeApp(firebaseConfig);
    this.authService = getAuth();
    this.remoteStore = getFirestore();
    this._initialized = true;
  }
  listen(name) {
    if (this._topics.has(name)) {
      return;
    }
    this._topics.add(name);
    document.addEventListener(name, this);
  }
  removeListener(name) {
    this._topics.delete(name);
    document.removeEventListener(name, this);
  }
  async updateRemoteDocument(collectionId, docId, updateProps) {
    await setDoc(doc(this.remoteStore, collectionId, docId), updateProps);
  }
  async getGameToEnter() {
    const gamesRef = collection(this.remoteStore, "games");
    // get only the games which haven't started yet
    const q = query(gamesRef, where("state", "==", 0));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size) {
      const game = querySnapshot.docs[0];
      return { id: game.id, ...game.data() };
    } else {
      TODO("Create a new game document");
    }
  }
  async createGame() {
    const gamesRef = collection(this.remoteStore, "games");
    // get only the games which haven't started yet
    const q = query(gamesRef, where("state", "==", 0));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.size) {
      const game = querySnapshot.docs[0];
      return { id: game.id, ...game.data() };
    } else {
      TODO("Create a new game document");
    }
  }
  query(params) {

  }
  status() {
    this.initialize();
    return new Promise((resolve, reject) => {
      if (
        this.firebaseApp &&
        this.authService &&
        this.remoteStore &&
        !this.error
      ) {
        resolve({ ok: true });
      } else {
        reject(this.error);
      }
    });
  }
  async signIn() {
    let result = await signInAnonymously(this.authService);
    return result?.user;
  }
  fetchUsers(createFakes) {
    // generate data locally for now
    // add some fake users so we can see what it might look like
    const users = [];
    if (createFakes) {
      for (let i=0; i<8; i++) {
        users.push({
          uid: (Math.random() * 1000).toFixed(1),
          displayName: mnemonic.encode([
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
            Math.floor(Math.random() * 256),
          ],  "x x-x").replace(/\b([a-z])/g, (m, initialLetter) => initialLetter.toUpperCase()),
          score: Math.floor(Math.random() * 26),
        });
      }
    }

    return new Promise((res, rej) => {
      setTimeout(() => res({
        added: users,
        status: users
      }), 60);
    });
  }

}

class FakeClient {
  constructor(config) {
    this.config = config;
    this.entries = [];
    this.byId = {};
    this._topics = new Set();
  }
  static getInstance(config) {
    if (!_fakeclientInstance) {
      _fakeclientInstance = new FakeClient(config);
    }
    return _fakeclientInstance;
  }
  listen(name) {
    if (this._topics.has(name)) {
      return;
    }
    this._topics.add(name);
    document.addEventListener(name, this);
  }
  removeListener(name) {
    this._topics.delete(name);
    document.removeEventListener(name, this);
  }
  start() {
    // set up networking, make a connection to remote service
  }

  status() {
    return new Promise((res, rej) => {
      res({ ok: true });
    });
  }
  /*
    game state represents:
      game board (the list of cards)
        { id, suit, value }
      users (the list of active users for this game)
        { id, name, score }
  */
  fetchCardsData() {
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
  updateCardsData({ id, action }) {
    return new Promise((res, rej) => {
      console.log("updateCardsData: ", id, action);

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
  fetchUsers() {
    // generate data locally for now
    // add some fake users so we can see what it might look like
    const users = [];
    for (let i=0; i<18; i++) {
      users.push({
        id: (Math.random() * 1000).toFixed(1),
        name: randomName(),
        score: Math.floor(Math.random() * 26),
      });
    }

    return new Promise((res, rej) => {
      setTimeout(() => res({
        added: users,
        status: users
      }), 60);
    });
  }
  onUserDataChange(data) {
    const event = new CustomEvent("userdatachange", {
      detail: {
        added: [],
        removed: [],
        updated: [],
      }
    });
    document.dispatchEvent(event);
  }
}

function getClient(config = {}) {
  if (config.kind == "fake") {
    return FakeClient.getInstance();
  }
  return Client.getInstance(config);
}

export default getClient;