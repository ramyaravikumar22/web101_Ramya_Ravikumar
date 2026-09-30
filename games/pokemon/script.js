// "Who's That Pokémon?": a guessing game powered by PokéAPI (https://pokeapi.co).
//
// How it works:
//   1. Pick a random Pokémon number (1-151, the original Pokémon).
//   2. fetch() its data from the API.
//   3. Show its picture as a black silhouette.
//   4. Compare the player's guess with the Pokémon's name.

const API_URL = "https://pokeapi.co/api/v2/pokemon/";
const MAX_ID = 151;

// --- Grab the elements we need from the page ---
const imgEl = document.getElementById("pokemon-img");
const loadingEl = document.getElementById("loading");
const messageEl = document.getElementById("message");
const formEl = document.getElementById("guess-form");
const inputEl = document.getElementById("guess-input");
const guessBtn = document.getElementById("guess-btn");
const hintBtn = document.getElementById("hint-btn");
const skipBtn = document.getElementById("skip-btn");
const nextBtn = document.getElementById("next-btn");
const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const bestEl = document.getElementById("best");

// --- Game state ---
let currentName = "";   // the answer, e.g. "pikachu"
let score = 0;
let streak = 0;
let best = loadBest();
let roundOver = true;
let hintsUsed = 0;

bestEl.textContent = best;

// localStorage remembers the best streak in the player's browser.
function loadBest() {
  try {
    return Number(localStorage.getItem("pokemonBestStreak")) || 0;
  } catch (e) {
    return 0; // storage can be blocked; the game still works
  }
}
function saveBest() {
  try {
    localStorage.setItem("pokemonBestStreak", String(best));
  } catch (e) { /* ignore */ }
}

// Names from the API are lowercase with dashes ("mr-mime", "nidoran-f").
// Strip everything except letters/numbers so "Mr. Mime" matches "mr-mime".
function normalize(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// "mr-mime" -> "mr mime" for showing to the player.
function prettyName(name) {
  return name.replace(/-/g, " ");
}

function setMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = type || "";
}

function setControls(playing) {
  guessBtn.disabled = !playing;
  hintBtn.disabled = !playing;
  skipBtn.disabled = !playing;
  inputEl.disabled = !playing;
  nextBtn.hidden = playing;
}

// Start a new round: fetch a random Pokémon and show its silhouette.
async function newRound() {
  roundOver = false;
  hintsUsed = 0;
  imgEl.hidden = true;
  loadingEl.hidden = false;
  loadingEl.textContent = "Loading...";
  setMessage("Guess the Pokémon from its shadow!");
  setControls(false);
  nextBtn.hidden = true;

  const id = Math.floor(Math.random() * MAX_ID) + 1;

  try {
    const response = await fetch(API_URL + id);
    if (!response.ok) throw new Error("Bad response: " + response.status);
    const data = await response.json();

    currentName = data.name;
    const picture =
      data.sprites.other["official-artwork"].front_default ||
      data.sprites.front_default;

    // Wait for the image to load before showing it, so it never flashes in colour.
    imgEl.classList.add("hidden-pokemon");
    imgEl.onload = () => {
      loadingEl.hidden = true;
      imgEl.hidden = false;
      setControls(true);
      inputEl.value = "";
      inputEl.focus();
    };
    imgEl.src = picture;
  } catch (error) {
    console.error(error);
    loadingEl.textContent = "Couldn't reach PokéAPI. Check your internet and try again.";
    nextBtn.hidden = false;
    nextBtn.textContent = "Try again";
    return;
  }
  nextBtn.textContent = "Next Pokémon →";
}

// End the round: show the real Pokémon in colour.
function reveal() {
  roundOver = true;
  imgEl.classList.remove("hidden-pokemon");
  setControls(false);
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the page from reloading
  if (roundOver) return;

  if (normalize(inputEl.value) === normalize(currentName)) {
    // Fewer points if you used hints
    const points = Math.max(1, 3 - hintsUsed);
    score += points;
    streak += 1;
    if (streak > best) {
      best = streak;
      saveBest();
    }
    setMessage(`Correct! It's ${prettyName(currentName)}! (+${points})`, "correct");
    reveal();
  } else {
    streak = 0;
    setMessage("Not quite, try again! (streak reset)", "wrong");
    inputEl.select();
  }
  updateScoreboard();
});

hintBtn.addEventListener("click", () => {
  if (roundOver) return;
  hintsUsed += 1;
  // Each hint reveals one more letter.
  const shown = currentName.slice(0, hintsUsed);
  const hidden = "_".repeat(Math.max(0, currentName.length - hintsUsed));
  setMessage(`Hint: ${shown}${hidden} (${currentName.length} letters)`);
});

skipBtn.addEventListener("click", () => {
  if (roundOver) return;
  streak = 0;
  setMessage(`It was ${prettyName(currentName)}!`, "wrong");
  reveal();
  updateScoreboard();
});

nextBtn.addEventListener("click", newRound);

function updateScoreboard() {
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  bestEl.textContent = best;
}

newRound();
