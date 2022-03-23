import Player from './player.js';

const SceneExports = {};

class Scene {
  constructor(elem, options={}) {
    this.elem = elem;
    this.id = this.elem.dataset.id = options.id;
    this.client = options.client;
    delete options.client;
    this.game = options.game;
    delete options.game;
    this.player = options.player;
    delete options.player;
    this.options = options;
    this._topics = new Set();
    this._onExitTasks = [];
    this._active = false;
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
  enter(params = {}) {
    this._active = true;
    this._onExitTasks.length = 0;
    if (params.client) {
      this.client = params.client;
    }
    if (params.game) {
      this.game = params.game;
    }
    this.elem.addEventListener("click", this);
    this.elem.classList.remove("hidden");
    document.body.dataset.scene = this.id;
    console.log("Entering scene: ", this.id, this);
  }
  exit() {
    this._active = false;
    for (let topic of this._topics){
      this.removeListener(topic);
    }
    this.elem.classList.add("hidden");

    if (this._onExitTasks.length) {
      let task;
      while ((task = this._onExitTasks.shift())) {
        task();
      }
    }
  }
  handleEvent(event) {
    let mname = 'on'+event.type[0].toUpperCase()+event.type.substring(1);
    if (typeof this[mname] == 'function') {
      this[mname].call(this, event);
    }
  }
}
SceneExports.Scene = Scene;
/*
 * Initial scene checks configurations, server availability etc.
 * Forwards to Lobby scene if it all checks out
 */
class InitializeScene extends Scene {
  enter(params = {}) {
    super.enter(params);
    let remoteUserPromise;
    if (this.game.player) {
      console.log("Re-visiting this scene, player already exists");
      console.log("TODO: re-authenticate? Reset the player somehow?");
    } else if (this.game.remoteUser) {
      remoteUserPromise = Promise.resolve(this.game.remoteUser);
    } else {
      remoteUserPromise = this.client.signIn().then(remoteUser => {
        this.game.remoteUser = remoteUser;
      });
    }
    remoteUserPromise
      .then(() => {
        this.statusOk({ ok: true });
      })
      .catch((ex) => {
        console.warn("Exception entering scene: ", ex);
        this.statusNotOk(ex);
      }
    );
  }
  async statusOk(statusData) {
    console.log("statusOk:", statusData);
    console.log("this.game.player:", this.game.player);
    if (!this.game.player) {
      const player = this.game.player = new Player(this.game.client, {
        collectionId: "players",
        userId: this.game.remoteUser.uid,
      });
      await player.initialize();
    }
    console.log("InitializeScene statusOk, switching to lobby scene");
    this.game.switchScene("lobby", statusData);
  }
  statusNotOk(statusResult){
    if (statusResult && statusResult instanceof Error) {
      this.game.switchScene("notavailable", { heading: "Status Error", message: statusResult.message, });
    } else if (statusResult && !statusResult.ok) {
      // TODO: we do have more fine-grained status data available for a more accurate message?
      this.game.switchScene("notavailable", { heading: "Offline", message: "52-Pickup is Offline right now, please come back later", });
    }
  }
}
SceneExports.InitializeScene = InitializeScene;

class _SceneWithPlayers extends Scene {
  updatePlayersList(remoteData) {
    console.log("updatePlayersList with remoteData:", remoteData);
    const byId = {};
    for (let item of this.playersList.querySelectorAll(".player")) {
      byId[item.dataset.id] = item;
    }
    const unseenIds = { ...byId };
    for (let d of remoteData) {
      if (d.id in byId) {
        const item = byId[d.id];
        if (item.textContent != d.displayName) {
          console.log("Update player name: ", d.displayName);
          item.textContent = d.displayName;
        }
      } else {
        const item = this.addPlayer(d);
        byId[d.id] = item;
      }
      delete unseenIds[d.id];
    }
    const selfId = this.game.player.id;
    let selfItem = byId[selfId];
    if (selfItem) {
      selfItem.classList.add("self");
    }
    console.log("unseenIds:", unseenIds);
    for (let [id, item] of Object.entries(unseenIds)) {
      item.parentNode.removeChild(item);
    }
  }
  addPlayer({ id, displayName }) {
    let item = document.createElement("li");
    item.textContent = displayName;
    item.dataset.id = id;
    item.className = "player";
    this.playersList.appendChild(item);
    return item;
  }
}

class LobbyScene extends _SceneWithPlayers {
  get allPlayersQuery() {
    return this.client.buildQuery({
      collectionId: "players",
      whereTerms: ["userId", "!=", "ghost"]
    });
  }
  enter(params = {}) {
    super.enter(params);

    this.game.id = "VRd8nImu8Vjz1J28DNhq";

    console.log("LobbyScene, got params", params);
    console.log("Player", this.game.player);

    this.playersList = this.elem.querySelector("#playersqueued");

    const allPlayersQuery = this.allPlayersQuery;
    this.client.addChangeListener(allPlayersQuery, this, "all-players");

    this._onExitTasks.push(() => {
      console.log("exit task: unhook the allPlayersQuery listener");
      this.client.removeChangeListener(allPlayersQuery, this, "all-players");
    });
  }
  handleChange(label, data) {
    switch (label) {
      case "self-change":
        console.log("The player document got an update:", data);
        document.querySelector("#player-name").textContent = data.
        break;
      case "all-players":
        console.log("The all-players query got an update:", data);
        this.updatePlayersList(data);
        break;
      default:
        console.info("changeListener got some change: ", label, data);
    }
  }
}
SceneExports.LobbyScene = LobbyScene;


class CardPlayScene extends _SceneWithPlayers {
  get gamePlayersQuery() {
    return this.client.buildQuery({
      collectionId: `games/${this.game.id}/players`,
      whereTerms: ["userId", "!=", "ghost"]
    });
  }
  async enter(params = {}) {
    super.enter(params);

    this._gotFirstCards = false;

    this.cardTableElem = this.elem.querySelector("#table");
    this.playersList = this.elem.querySelector("#playerStatus");

    this.elem.addEventListener("game-action", this);

    console.log("CardPlayScene enter, preparing queries. game id: ", this.game.id);

    // we'll monitor the players list so we can know which cards are claimed
    // and each player score
    const gamePlayersQuery = this.gamePlayersQuery;
    console.log("CardPlayScene enter, addChangeListener for all-players");
    this.client.addChangeListener(gamePlayersQuery, this, "all-players");

    // monitor the cards list
    let allCardsQuery = this.client.buildQuery({
      collectionId: `/games/${this.game.id}/cards`
    });

    console.log("CardPlayScene enter, addChangeListener for all-cards");
    this.client.addChangeListener(allCardsQuery, this, "all-cards");

    this._onExitTasks.push(() => {
      console.log("exit task: unhook the gamePlayersQuery listener");
      this.client.removeChangeListener(gamePlayersQuery, this, "all-players");
      this.client.removeChangeListener(allCardsQuery, this, "all-cards");
    });
  }

  onInitialCardsList(remoteData) {
    console.log("CardPlayScene enter, onInitialCardsList", remoteData);
    this._gotFirstCards = true;

    // we start out using the whole collection of cards
    // value: 1 2 3 4 5 6 7 8 9 10 J Q K
    // suit: ♥ ♦ ♣ ♠
    this.cardTableElem.begin({ added: remoteData });
  }

  handleChange(label, data) {
    switch (label) {
      case "self-change":
        console.log("The player document got an update:", data);
        break;
      case "all-players":
        this.updatePlayersList(data);
        break;
      case "all-cards":
        console.log("The all-cards query got an update:", data);
        if (!this._gotFirstCards) {
          this.onInitialCardsList(data);
        } else {
          console.log("all-cards query update");
        }
        // this.updatePlayersList(data);
        break;
      default:
        console.info("changeListener got some change: ", label, data);
    }
  }

  handleEvent(event) {
    const eventData = event.detail;
    if (event.type == "click" && event.target.localName == "game-card") {
      const card = event.target;
      const eventData = {
        action: "remove-card",
        id: card.id,
      };
      card.remove(); // optimistically start hiding the card, we'll restore it if necessary

      this.client.updateCardsData(eventData).then(result => {
        console.log("got updateCardsData result:", result);
        this.cardTableElem.update({ removed: [result.id] });
      }).catch(ex => {
        console.warn("Exception handling game-action:", eventData, ex);
      });
    }
  }
}
SceneExports.CardPlayScene = CardPlayScene;

class GameOverScene extends Scene {
}
SceneExports.GameOverScene = GameOverScene;

class NotAvailableScene extends Scene {
  constructor(elem, options) {
    super(elem, options);
    this.heading = this.elem.querySelector(".heading");
    this.message = this.elem.querySelector(".message");
  }
  enter(params = {}) {
    super.enter(params);
    console.log("Enter NotAvailableScene, errorCode:", params.errorCode);

    if (this.game.joined) {
      this.client.leaveQueue();
      this.game.joined = false;
    }

    if (params.titleText) {
      this.heading.textContent = params.titleText;
    } else {
      this.heading.textContent = params.heading || "";
    }
    if (params.contentFragment) {
      this.message.textContent = "";
      this.message.appendChild(params.contentFragment);
    } else {
      this.message.textContent = params.message || "";
    }
    if (params.className) {
      if (this.message.firstElementChild.hasAttribute("class")) {
        let node = this.elem.querySelector(".body-upper");
        for (let cls of params.className.split(" ")) {
          node.classList.add(cls);
        }
      }
    }
    if (typeof window.gtag == "function") {
      gtag('event', 'exception', {
        'description': params.errorCode || params.heading,
        'fatal': false,
      });
    }
  }
  exit() {
    super.exit();
    this.elem.querySelector(".body-upper").className = "body-upper";
  }
}
SceneExports.NotAvailableScene = NotAvailableScene;


export default SceneExports;
