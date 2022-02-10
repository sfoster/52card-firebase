import getClient from './client.js';

class User {
  initialize(user) {
    this.uid = user.uid;
    this.displayName = user.displayName;
    this.score = user.score || 0;
    if (!this.displayName) {
      let displayName = mnemonic.encode([
        this.uid.charCodeAt(0),
        this.uid.charCodeAt(1),
        this.uid.charCodeAt(this.uid.length-1),
        this.uid.charCodeAt(Math.floor(Math.random() * this.uid.length))
      ],  "x x-x").replace(/\b([a-z])/g, (m, initialLetter) => initialLetter.toUpperCase());
      return this.update({ displayName });
    }
  }
  async update(props) {
    // Add a new document in collection "players"
    const updateProps = Object.assign({
      uid: this.uid,
      lastSeen: Date.now(),
    }, props);
    const client = getClient();
    try {
      await client.updateRemoteDocument("players", this.uid, updateProps);
      Object.assign(this, props);
    } catch (ex) {
      console.warn("Failed to update player doc:", ex);
    }
  }
}
export default User;