// Tidepool – Part 2: catch the search, fetch from Wikimedia Commons, render cards.

const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const clearBtn = document.getElementById("clear-btn");
const results = document.getElementById("results");
const resultCount = document.getElementById("result-count");
const emptyState = document.getElementById("empty-state");
const emptyTitle = document.getElementById("empty-title");
const emptyText = document.getElementById("empty-text");
const chips = document.querySelectorAll(".chip");

const API = "https://commons.wikimedia.org/w/api.php";

// "File:Red_fox_(Vulpes_vulpes).jpg" -> "Red fox (Vulpes vulpes)"
function cleanTitle(raw) {
  return raw.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ").trim();
}

// The API returns the author as an HTML snippet; keep only its text.
function plainText(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent.trim();
}

function buildUrl(query) {
  const params =
    "action=query&format=json&origin=*" +
    "&generator=search&gsrnamespace=6&gsrlimit=24" +
    "&gsrsearch=" + encodeURIComponent(query + " filetype:bitmap") +
    "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480";
  return API + "?" + params;
}

function createCard(page) {
  const info = page.imageinfo[0];
  const title = cleanTitle(page.title);
  const meta = info.extmetadata || {};
  const author = meta.Artist ? plainText(meta.Artist.value) : "";

  // The whole card links to the full-size image in a new tab.
  const card = document.createElement("a");
  card.className = "card";
  card.href = info.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";

  const img = document.createElement("img");
  img.src = info.thumburl || info.url;
  img.alt = title;
  img.loading = "lazy";

  const caption = document.createElement("div");
  caption.className = "card-body";

  const name = document.createElement("p");
  name.className = "card-title";
  name.textContent = title;

  const by = document.createElement("p");
  by.className = "card-author";
  by.textContent = author ? "By " + author : "Author unknown";

  caption.appendChild(name);
  caption.appendChild(by);
  card.appendChild(img);
  card.appendChild(caption);
  return card;
}

function showEmpty(title, text) {
  emptyTitle.textContent = title;
  emptyText.textContent = text;
  emptyState.hidden = false;
}

async function searchImages(query) {
  const response = await fetch(buildUrl(query));
  if (!response.ok) return;
  const data = await response.json();

  results.innerHTML = ""; // clear old results first

  // No matches means the API leaves out "query" entirely.
  const pages = data.query ? Object.values(data.query.pages) : [];
  const usable = pages
    .filter((page) => page.imageinfo && page.imageinfo.length > 0)
    .sort((a, b) => a.index - b.index);

  usable.forEach((page) => results.appendChild(createCard(page)));

  const n = usable.length;
  resultCount.textContent = "Showing " + n + (n === 1 ? " result" : " results") + ' for "' + query + '"';

  if (n === 0) {
    showEmpty("No images found", "Try a different word, or pick one of the quick picks.");
  } else {
    emptyState.hidden = true;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return; // blank search: do nothing
  await searchImages(query);
});

// Quick-pick chips fill the box and run a search.
chips.forEach((chip) => {
  chip.addEventListener("click", async () => {
    input.value = chip.dataset.topic;
    await searchImages(chip.dataset.topic);
  });
});

// Clear empties the box and puts the cursor back in it.
clearBtn.addEventListener("click", () => {
  input.value = "";
  input.focus();
});
