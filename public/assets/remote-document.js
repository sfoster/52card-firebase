class RemoteDocument {
  static getId() {
    if (!this._nextId) {
      this._id = Math.floor(1e6 / Math.random());
    }
    return (++this._id);
  }
  constructor(client, options) {
    this._client = client;
    this._options = options;
    this._id = RemoteDocument.getId();
    this._changeListenerLabels = new Set();
    this._remoteDocumentData = null;
  }
  async initialize(initialData) {
    let { collectionId, docId } = this._options;
    const data = await this._client.getOrCreateDocument(collectionId, docId, initialData);
    this._remoteDocumentData = data;
    console.log("RemoteDocument#initialize, getOrCreateDocument callback got data", this._remoteDocumentData);
    this.listen(`/${collectionId}/${this.id}/self-change`);
  }
  listen(topic) {
    const [_, collectionId, docId, label] = topic.split("/");
    if (!label) {
      label = this._id;
    }
    if (this._changeListenerLabels.has(label)) {
      return;
    }
    this._client.addChangeListener({ collectionId, docId }, this, label);
    this._changeListenerLabels.add(label);
  }
  unlisten(topic) {
    const [_, collectionId, docId, label] = topic.split("/");
    if (!label) {
      label = this._id;
    }
    if (!this._changeListenerLabels.has(label)) {
      return;
    }
    this._client.removeChangeListener({ collectionId, docId }, this, label);
    this._changeListenerLabels.delete(label);
  }
  update(changes = {}) {
    let { collectionId } = this._options;
    console.log("calling updateDocument with changes", changes);
    return this._client.updateDocument(collectionId, this.id, changes);
  }
  handleChange(label, data) {
    if (!this._changeListenerLabels.has(label)) {
      return;
    }
    if (label == "self-change") {
      this._remoteDocumentData = data;
    }
  }
}
export default RemoteDocument;