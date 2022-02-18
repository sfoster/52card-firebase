import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  getDocs,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

let _clientInstance;
let _fakeclientInstance;

class FirebaseClient {
  constructor(config) {
    this.config = config;
    this.entries = [];
    this.byId = {};
    this._remoteChangeListeners = new Map();
    this.error = null;
  }
  static getInstance(config) {
    if (!_clientInstance) {
      _clientInstance = new FirebaseClient(config);
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
  buildQuery(queryParams) {
    const q = query(
      collection(this.remoteStore, queryParams.collectionId),
      where(...queryParams.whereTerms)
    );
    return q;
  }
  _makeKeyFromQuery(query) {
    if (query.type == "query") {
      let params = {
        path: query._query.path,
        collectionGroup: query._query.collectionGroup,
        explicitOrderBy: query._query.explicitOrderBy,
        filters: query._query.filters
      };
      return JSON.stringify(params);
    } else {
      return JSON.stringify(query);
    }
  }
  addChangeListener(queryParams = {}, listener, label) {
    let changeQuery;
    let topicKey = this._makeKeyFromQuery(queryParams);
    if (!label) {
      label = topicKey;
    }
    let entry;
    let unsubscriber;
    let listeners;

    console.log("addChangeListener, type:", queryParams.type, label);
    if (queryParams.type == "query") {
      changeQuery = queryParams;
    } else {
      let { collectionId, docId } = queryParams;
      if (!(collectionId && docId)) {
        throw new Error(`CollectionId (${collectionId}) and docId (${docId}) must be supplied.`);
      }
      changeQuery = doc(this.remoteStore, collectionId, docId)
    }
    if (this._remoteChangeListeners.has(topicKey)) {
      // we are already watching for this snapshot
      entry = this._remoteChangeListeners.get(topicKey);
      unsubscriber = entry.unsubscriber;
      listeners = entry.listeners;
    } else {
      unsubscriber = onSnapshot(changeQuery, (result) => {
        if (queryParams.type == "query") {
          let results = [];
          result.forEach(doc => {
            results.push(doc.data());
          });
          this.onRemoteChange(topicKey, results);
        } else {
          const doc = result;
          const source = doc.metadata.hasPendingWrites ? "Local" : "Server";
          if (!doc.metadata.hasPendingWrites) {
            this.onRemoteChange(topicKey, doc.data(), source);
          }
        }
      });
      entry = {
        unsubscriber,
        listeners: new Map(),
      };
      this._remoteChangeListeners.set(topicKey, entry);
    }
    entry.listeners.set(label || topicKey, listener);
  }
  removeChangeListener(queryParams, listener, label) {
    console.log("removeChangeListener, type:", queryParams.type, label);
    let topicKey = this._makeKeyFromQuery(queryParams);
    if (!label) {
      label = topicKey;
    }
    const entry = this._remoteChangeListeners.get(topicKey);
    if (!entry) {
      console.log("No change listener for:", topicKey);
      return;
    }
    if (entry.listeners.has(label)) {
      entry.listeners.delete(label);
    }
    if (!entry.listeners.size) {
      entry.unsubscriber();
      this._remoteChangeListeners.delete(topicKey);
    }
  }
  onRemoteChange(topicKey, data, source) {
    console.log("onRemoteChange: ", topicKey, data, source);
    const entry = this._remoteChangeListeners.get(topicKey);
    if (!entry) {
      console.log("No entry for document change: ", topicKey);
      return;
    }
    entry.listeners.forEach((listener, label) => {
      if (typeof listener.handleChange == "function") {
        listener.handleChange(label, data);
      } else {
        listener(label, data);
      }
    });
  }
  async updateDocument(collectionId, docId, updateProps) {
    await setDoc(doc(this.remoteStore, collectionId, docId), updateProps);
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
    await this.initialize();
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
  return FirebaseClient.getInstance(config);
}

export default getClient;