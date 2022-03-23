'use strict';

const gameData = {
  fields: {
    state: 0,
  },
  collections: {
    players: [],
    cards: [],
  }
};
for (let suit of "♥♦♣♠") {
  for (let value of ["A","2","3","4","5","6","7","8","9","10","J","Q","K"]) {
    gameData.collections.cards.push({
      suit,
      value
    });
  }
}

module.exports = { data: gameData };

