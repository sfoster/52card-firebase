import RemoteDocument from './remote-document.js';

class Player extends RemoteDocument {
  get displayName() {
    return this._remoteDocumentData?.displayName;
  }
  get score() {
    return this._remoteDocumentData?.score || 0;
  }
  get id() {
    return this._remoteDocumentData?.id;
  }
  async initialize() {
    let { collectionId, userId } = this._options;
    let displayName;
    if (!this.displayName) {
      const seedStr = userId || collectionId;
      displayName = mnemonic.encode([
        seedStr.charCodeAt(0),
        seedStr.charCodeAt(1),
        seedStr.charCodeAt(seedStr.length-1),
        seedStr.charCodeAt(Math.floor(Math.random() * seedStr.length))
      ],  "x x-x").replace(/\b([a-z])/g, (m, initialLetter) => initialLetter.toUpperCase());
    }
    await super.initialize({ displayName, userId });
  }
  handleChange(label, data) {
    if (label == "self-change") {
    }
    switch (label) {
      case "self-change":
        super.handleChange(label, data);
        console.log("got self-change: ", data, this.displayName);
        break;
      default:
        console.log("Remote change not handled: ", label, data);
        break;
    }
  }
}
export default Player;