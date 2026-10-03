const challenges = [
  ["Design a fake luxury product.","Invent a useless object and make it look expensive.","15 min","DESIGN"],
  ["Build a one-button website.","The button should do one surprisingly satisfying thing.","20 min","CODE"],
  ["Make a tiny personal dashboard.","Show only three numbers that matter to you today.","25 min","BUILD"],
  ["Write a terrible startup pitch.","Make the idea ridiculous, but pitch it like it will change the world.","10 min","WRITE"],
  ["Create a digital lucky charm.","Build a small page that gives the visitor a random good omen.","20 min","CODE"],
  ["Redesign the calculator.","Keep it usable, but make it feel like it came from 2045.","30 min","DESIGN"],
  ["Make a zero-scroll website.","Everything important must fit on one screen.","20 min","BUILD"],
  ["Invent a new holiday.","Give it a name, three rules and a landing page headline.","12 min","CREATE"],
  ["Build a decision coin.","Two choices go in. One dramatic answer comes out.","18 min","CODE"],
  ["Create a tiny victory screen.","Make finishing a boring task feel like winning a championship.","15 min","DESIGN"]
];

const challenge = document.getElementById("challenge");
const detail = document.getElementById("detail");
const time = document.getElementById("time");
const mode = document.getElementById("mode");
const card = document.getElementById("card");
const generate = document.getElementById("generate");
const copy = document.getElementById("copy");

let last = -1;

function nextChallenge(){
  let index;
  do {
    index = Math.floor(Math.random() * challenges.length);
  } while (index === last && challenges.length > 1);
  last = index;

  const [title, desc, duration, type] = challenges[index];
  challenge.textContent = title;
  detail.textContent = desc;
  time.textContent = duration;
  mode.textContent = type;

  card.classList.remove("pop");
  requestAnimationFrame(() => card.classList.add("pop"));
  setTimeout(() => card.classList.remove("pop"), 220);
}

generate.addEventListener("click", nextChallenge);

copy.addEventListener("click", async () => {
  const text = `${challenge.textContent} — ${detail.textContent}`;
  try {
    await navigator.clipboard.writeText(text);
    copy.textContent = "Copied";
    setTimeout(() => copy.textContent = "Copy challenge", 1200);
  } catch {
    copy.textContent = "Copy failed";
    setTimeout(() => copy.textContent = "Copy challenge", 1200);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat) {
    event.preventDefault();
    nextChallenge();
  }
});

nextChallenge();