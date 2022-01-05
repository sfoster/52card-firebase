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
  }
  handleEvent(event) {
    let mname = 'on'+event.type[0].toUpperCase()+event.type.substring(1);
    if (typeof this[mname] == 'function') {
      this[mname].call(this, event);
    }
  }
}

/*
 * Initial scene checks configurations, server availability etc.
 * Forwards to Lobby scene if it all checks out
 */
class InitializeScene extends Scene {
  enter(params = {}) {
    super.enter(params);
    this.client.status().then(result => {
      if (result.ok) {
        this.statusOk(result);
      } else {
        this.statusNotOk(result);
      }
    }).catch(ex =>{
      console.warn("Exception entering scene: ", ex);
      this.statusNotOk(ex);
    })
  }
  statusOk(statusData) {
    this.game.switchScene("lobby", statusData);
  }
  statusNotOk(statusResult){
    if (statusResult && statusResult instanceof Error) {
      game.switchScene("notavailable", { heading: "Status Error", message: statusResult.message, });
    } else if (statusResult && !statusResult.ok) {
      // TODO: we do have more fine-grained status data available for a more accurate message?
      game.switchScene("notavailable", { heading: "Offline", message: "ColorLaunch is Offline right now, please come back later", });
    }
  }
}

class LobbyScene extends Scene {
  enter(params = {}) {
    super.enter(params);
    this.userList = this.elem.querySelector("#playersjoined");
    this.addUser({ id: "playerone", name: "", placeholder: "Your name goes here" });
    this.client.fetchUserData().then(data => {
      for (let user of data.added) {
        this.addUser(Object.assign(user, { remote: true }));
      }
    })
  }
  addUser({ id, name, placeholder="", remote=false }) {
    let item = new EditableItem();
    item.remote = remote;
    item.value = name;
    item.placeholder = placeholder;
    this.userList.appendChild(item);
    console.log("Adding user: ", item, name, remote);
  }
}

class CardPlayScene extends Scene {
  async enter(params = {}) {
    super.enter(params);
    this.elem.addEventListener("game-action", this);
    this.cardTableElem = this.elem.querySelector("#table");
    const cardItemsPromise = this.client.fetchCardsData();
    const usersPromise = this.client.fetchUserData();
    this.cardTableElem.begin({ added: await cardItemsPromise });

    this.userList = this.elem.querySelector("#userStatus");
    const { status } = await usersPromise;
    console.log("CardPlayScene#enter, users:", status);

    let frag = document.createDocumentFragment();
    for (let user of await status) {
      let item = document.createElement("li");
      item.textContent = `${user.name} (${user.score})`;
      frag.appendChild(item);
    }
    this.userList.appendChild(frag);
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

class GameOverScene extends Scene {
}

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

