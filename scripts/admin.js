'use strict';

const fs = require('firebase-admin');
const serviceAccount = require('./.card-pickup-firebase-adminsdk.json');

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');


fs.initializeApp({
 credential: fs.credential.cert(serviceAccount)
});

const db = getFirestore();

async function listPlayers() {
  const playersSnapshot = await db.collection('players').orderBy('displayName').get();
  playersSnapshot.forEach((doc) => {
    if (doc.id.startsWith("null-")) {
      return;
    }
    console.log(doc.id, " => ", doc.data());
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  console.log(`deleteQueryBatch of ${batchSize} size`);
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    console.log("deleting doc: ", doc.id);
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function resetPlayers() {
  const collectionRef = db.collection('players');
  const batchSize = 5;
  // delete all but our null/ghost player
  const query = collectionRef.where('userId', '!=', 'ghost').limit(5);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function createNewGame() {
  let data = require('./lib/new-game').data;
  console.log("game data:", data);

  const nullPlayerSnapshot = await db.collection("players").doc("null-player").get();
  if (!nullPlayerSnapshot.exists) {
    console.warn("null-player doesnt exist, aborting");
    return;
  }
  const addResult = await db.collection("games").add(data.fields);
  const gameId = addResult.id;
  const gameRef = db.collection("games").doc(gameId);

  // Get a new write batch
  const batch = db.batch();

  const cardsCollectionRef = gameRef.collection("cards");
  const playersCollectionRef = gameRef.collection("players");

  for (let docData of data.collections.cards) {
    // populate the new card document
    const docRef = cardsCollectionRef.doc();
    batch.set(docRef, docData);
  }
  const ghostGamePlayerRef = playersCollectionRef.doc();
  batch.set(ghostGamePlayerRef, nullPlayerSnapshot.data());
  // Commit the batch
  await batch.commit();
}

// async function limitToLastQuery() {
//   const collectionReference = firestore.collection('games');
//   const gameDocuments = await collectionReference
//     .orderBy('name')
//     .limitToLast(2)
//     .get();
//   const gameDocumentData = gameDocuments.docs.map(d => d.data());
//   gameDocumentData.forEach(doc => {
//     console.log(doc.name);
//   });
// }
// limitToLastQuery();

// listPlayers();
resetPlayers();
// createNewGame();