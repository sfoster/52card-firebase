import RemoteDocument from './remote-document.js';

class Player extends RemoteDocument {
  get displayName() {
    return this._remoteDocumentData?.displayName;
  }
  get score() {
    return this._remoteDocumentData?.score || 0;
  }
  async initialize() {
    let { collectionId, docId } = this._options;
    let displayName;
    if (!this.displayName) {
      displayName = mnemonic.encode([
        docId.charCodeAt(0),
        docId.charCodeAt(1),
        docId.charCodeAt(docId.length-1),
        docId.charCodeAt(Math.floor(Math.random() * docId.length))
      ],  "x x-x").replace(/\b([a-z])/g, (m, initialLetter) => initialLetter.toUpperCase());
    }
    await super.initialize({ displayName });
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