const __adjectives = [
  "funny", "wierd", "unusual", "strange", "peculiar",
  "fabled", "notable", "well known", "famous", "noted",
  "ancient", "great", "vast", "pink",
  "fabulous", "exotic", "hoopy", "exciting",
  "unremarkable", "boring", "dull", "tedious", "revolting",
  "occasional", "unpredictable", "dreadful", "deadly",
  "edible", "spotted",
  "ancient", "exceptional", "eccentric", "tasty",
  "killer", "deadly", "evil", "lethal", "vicious"
];
const __nouns = [
  "wasp", "moth", "grub", "ant",
  "poet", "arts graduate", "yak", "snail", "slug",
  "plant", "tulip", "banana", "corn", "weed",
  "shrew", "beast", "bison", "snake", "wolf",
  "leopard", "cat", "monkey", "goat", "fish"
];

const _selectedNames = new Set();
console.log("__adjectives:", __adjectives.length);
console.log("__nouns:", __nouns.length);

function randomName() {
  let name = _randomName();
  while (_selectedNames.has(name)) {
    name = _randomName();
  }
  _selectedNames.add(name);
  return name;
}
function _pickFromList(list) {
  let i = Math.floor(Math.random() * list.length);
  return list[i];
}
function _randomName() {
  let adj  = _pickFromList(__adjectives);
  let noun = _pickFromList(__nouns);
  return (adj + " " + noun).replace(/(?:^|\s+)([a-z])/g, (m, letter) => letter.toUpperCase());
}
