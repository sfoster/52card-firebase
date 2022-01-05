function waitForTransition(element, timeout = 5000) {
  return new Promise((resolve, reject) => {
    let cleanup = () => {
      element.removeEventListener("transitionrun", listener);
      element.removeEventListener("transitionend", listener);
    };

    let timer = setTimeout(() => {
      cleanup();
      reject();
    }, timeout);

    let transitionCount = 0;

    let listener = event => {
      if (event.type == "transitionrun") {
        transitionCount++;
      } else {
        transitionCount--;
        if (transitionCount == 0) {
          cleanup();
          clearTimeout(timer);
          resolve();
        }
      }
    };

    element.addEventListener("transitionrun", listener);
    element.addEventListener("transitionend", listener);
    element.addEventListener("transitioncancel", listener);
  });
}

class CardTableContainer extends HTMLElement {
  constructor(elem) {
    super();
    this.bounds = [800,600];
    this._playing = false;
  }
  set playing(val) {
    if (val) {
      this.setAttribute("enabled", "");
      this._playing = true;
    } else {
      this.removeAttribute("enabled");
      this._playing = false;
    }
  }
  get playing() {
    return this._playing;
  }
  connectedCallback() {
    this.playing = this.hasAttribute("playing");
  }
  end() {
    this.playing = false;
    console.log("Done");
  }
  begin({added = [], removed = []}) {
    this.cardsById = new Map();
    this.playing = true;
    this.textContent = "";
    this.addItems(added);
    this.removeItems(removed);
  }
  removeItems(items) {
    for (let item of items) {
      let id = item.id ?? item;
      let card = this.cardsById.get(id);
      if (card) {
        console.log("Removing card:", card.id);
        card.remove().then(() => {
          this.cardsById.delete(id);
        });
      } else {
        console.warn(`removeItems: ${id} is already gone`);
      }
    }
  }
  addItems(items) {
    let fragment = document.createDocumentFragment();
    let zIndex = 0;
    let ubounds = [this.bounds[0] - 80, this.bounds[1] - 140];
    for (let item of items) {
      let card;
      if (this.cardsById.has(item.id)) {
        card = this.cardsById.get(item.id);
        card.restore();
      } else {
        card = document.createElement("game-card");
        card.setAttribute("x", Math.floor(Math.random() * ubounds[0] - 10));
        card.setAttribute("y", Math.floor(Math.random() * ubounds[1] - 10));
        card.setAttribute("z", ++zIndex);
        card.setAttribute("rotate", Math.floor(Math.random() * 360));
        card.setAttribute("value", item.value);
        card.setAttribute("suit", item.suit);
        card.id = item.id;
        fragment.appendChild(card);
        this.cardsById.set(item.id, card);
      }
    }
    console.log("created all the children:", fragment.childNodes);
    this.appendChild(fragment);
  }
  update({ added, removed }) {
    if (added) {
      this.addItems(added);
    }
    if (removed) {
      this.removeItems(removed);
    }
  }
}

customElements.define("game-table", CardTableContainer);

class Card extends HTMLElement {
  connectedCallback() {
    this.classList.add("card", this.getAttribute("suit"));
    let transformValue = `translate(${this.getAttribute("x")}px, ${this.getAttribute("y")}px) rotate(${this.getAttribute("rotate")}deg)`;
    this.style.transform = transformValue;
    this.style.zIndex = this.getAttribute("z");
    this.textContent = this.getAttribute("value") + this.getAttribute("suit");
    this.restore();
  }
  remove() {
    if (this._removalPromise) {
      console.log(`Card: ${this.id} already scheduled for removal`);
      return this._removalPromise;
    }
    let transitioned = waitForTransition(this);
    this.classList.add("removing");
    this._pendingRemoval = true;
    console.log(`Card: scheduling removal of ${this.id}`);
    this._removalPromise = transitioned.finally(() => {
      if (this._pendingRemoval) {
        console.log(`Card: confirming removal of ${this.id}`);
        this._pendingRemoval = false;
        super.remove();
      }
    });
    return this._removalPromise;
  }
  restore() {
    this._pendingRemoval = false;
    this._removalPromise = null;
    this.classList.remove("removing");
  }
}
customElements.define("game-card", Card);

class EditableItem extends HTMLElement {
  connectedCallback() {
    this.classList.add("editable-label");
    this.textContent = "";
    let input = this.input = document.createElement("input");
    input.type = "text";
    input.placeholder = this.placeholder;
    input.setAttribute("spellcheck", "false");
    let okButton = this.okButton = document.createElement("button");
    okButton.textContent = "OK";
    this.appendChild(input);
    this.appendChild(okButton);
    this.value = this.dataset.value;
    this.remote = this.dataset.remote == "false" ? false : true;
    this.input.value = this.value;
    this.endEditing();
  }
  get value() {
    return this.dataset.value;
  }
  set value(val) {
    this.dataset.value = val;
    if (this.input) {
      this.input.value = val;
    }
  }
  get placeholder() {
    return this.dataset.placeholder;
  }
  set placeholder(val) {
    this.dataset.placeholder = val;
    if (this.input) {
      this.input.placeholder = val;
    }
  }
  get remote() {
    return this.dataset.remote;
  }
  set remote(val) {
    val = !!val;
    console.log("Setting remote:", val);
    this.dataset.remote = val;
    if (this.input) {
      this.input.readOnly = val;
    }
  }
  remove() {
    if (this._removalPromise) {
      console.log(`Card: ${this.id} already scheduled for removal`);
      return this._removalPromise;
    }
    let transitioned = waitForTransition(this);
    this.classList.add("removing");
    this._pendingRemoval = true;
    this._removalPromise = transitioned.finally(() => {
      if (this._pendingRemoval) {
        console.log(`EditableLabel: confirming removal of ${this.id}`);
        this._pendingRemoval = false;
        super.remove();
      }
    });
    return this._removalPromise;
  }
  restore() {
    this._pendingRemoval = false;
    this._removalPromise = null;
    this.classList.remove("removing");
  }
  handleEvent(event) {
    if (event.type =="focus") {
      this.startEditing();
      return;
    }
    if (
      (event.type =="keyup" && event.key == "Enter") ||
      event.type =="blur"
    ) {
      this.endEditing();
      return;
    }
  }
  startEditing() {
    this.setAttribute("editing", "");
    this.addEventListener("keyup", this);
    this.addEventListener("blur", this);
    console.log("startEditing, value: ", this.value, this.input.value);
  }
  endEditing() {
    this.removeAttribute("editing");
    if (!this.hasAttribute("remote")) {
      this.addEventListener("focus", this);
    }
    this.value = this.input.value.trim();
  }
}
customElements.define("editable-item", EditableItem);
