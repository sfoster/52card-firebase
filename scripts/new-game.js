const gameData = {
  collections: {
    players: [],
    cards: [],
  },
  fields: {
    state: 0,
  }
};
for(let suit of "♥♠♣♦") {
  for (let value of ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]) {
    let docData = { value, suit };
    gameData.collections.cards.push(docData);
  }
}

exports.data = gameData;