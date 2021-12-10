class Game {
  constructor(elem, options = {}) {
    this.elem = elem || document.body;
    this.options = options;
    this.turnCount = 0;
    this.scenes = {};
    this.currentScene = null;
    this.messageElem = null;
  }
  registerScene(name, scene) {
    this.scenes[name] = scene;
  }
  switchScene(name, sceneParams = {}) {
    if (this.previousScene) {
      this.previousScene.elem.classList.remove("previous");
      this.previousScene = null;
    }
    if (this.currentScene) {
      if (this.currentScene.id.startsWith("waiting")) {
        this.previousScene = this.currentScene;
      }
      this.currentScene.elem.classList.remove("current");
      this.currentScene.exit();
    }
    if (this.previousScene) {
      this.previousScene.elem.classList.add("previous");
    }
    this.currentScene = this.scenes[name];
    this.currentScene.enter(sceneParams);
  }
  showNotification(message) {
    console.log("Notification:", message);
  }
  handleEvent(event) {
    if (event.type == "click" && event.target == this.messageElem) {
      this.messageElem.classList.add("hidden");
    }
  }
}

window.config = {};

window.onload = function() {
  const game = window.game = new Game();

  const client =  game.client = new Client(window.config);
  const sceneArgs = {
    game, client
  };

  game.registerScene(
    "lobby",
    new LobbyScene(document.getElementById("lobby"),
                     Object.assign({}, sceneArgs, { id: "lobby" }))
  );

  game.registerScene(
    "cardplay",
    new CardPlayScene(
      document.getElementById("cardplay"),
      Object.assign({}, sceneArgs, {
        id: "cardplay",
      })
    )
  );

  game.registerScene(
    "gameover",
    new GameOverScene(
      document.getElementById("gameover"),
      Object.assign({}, sceneArgs, {
        id: "gameover"
      })
    )
  );

  game.registerScene(
    "notavailable",
    new NotAvailableScene(
      document.getElementById("notavailable"),
      Object.assign({}, sceneArgs, { id: "notavailable" })
    )
  );

  game.registerScene(
    "startup",
    new InitializeScene(document.getElementById("initializing"),
              Object.assign({}, sceneArgs, { id: "startup" }))
  );

  // start at the init screen
  game.switchScene("startup");
};
