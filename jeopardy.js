const NUM_CATEGORIES = 6;
const NUM_QUESTIONS_PER_CAT = 5;

const API_BASE = "https://rithm-jeopardy.herokuapp.com/api";

let categories = [];

// Return array of category ids
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Return a random sample of n items from the array
function sampleSize(arr, n) {
    const copy = [...arr];
    shuffle(copy);
    return copy.slice(0, n);
}



async function getCategoryIds() {
    // Get a bunch and sample
    const res = await $.getJSON(`${API_BASE}/categories?count=100`);

    // Keep only categories that can support 5 clues
    const valid = res.filter((c) => c.clues_count >= NUM_QUESTIONS_PER_CAT);

    const picked = sampleSize(valid, NUM_CATEGORIES);
    return picked.map((c) => c.id);
}


async function getCategory(catId) {
    const res = await $.getJSON(`${API_BASE}/category?id=${catId}`);

    const title = res.title;

    // Filter out any weird blanks just in case
    const validClues = res.clues.filter((clue) => clue.question && clue.answer);

    const picked = sampleSize(validClues, NUM_QUESTIONS_PER_CAT).map((clue) => ({
        question: clue.question,
        answer: clue.answer,
        showing: null,
    }));

    return { title, clues: picked };
}

// Fill the HTML table
async function fillTable() {
    const $table = $("#jeopardy");
    $table.empty();

    // Build THEAD
    const $thead = $("<thead>");
    const $headRow = $("<tr>");
    for (let c = 0; c < NUM_CATEGORIES; c++) {
        $headRow.append($("<th>").text(categories[c].title.toUpperCase()));
    }
    $thead.append($headRow);
    $table.append($thead);

    // Build TBODY
    const $tbody = $("<tbody>");
    for (let r = 0; r < NUM_QUESTIONS_PER_CAT; r++) {
        const $row = $("<tr>");
        for (let c = 0; c < NUM_CATEGORIES; c++) {
            const $cell = $("<td>")
                .text("?")
                .attr("data-cat", c)
                .attr("data-clue", r);
            $row.append($cell);
        }
        $tbody.append($row);
    }
    $table.append($tbody);
}

// Clicking on a clue handle
function handleClick(evt) {
    const $cell = $(evt.target);
    if (!$cell.is("td")) return;

    const catIdx = Number($cell.attr("data-cat"));
    const clueIdx = Number($cell.attr("data-clue"));

    const clue = categories[catIdx].clues[clueIdx];

    if (clue.showing === null) {
        clue.showing = "question";
        $cell.text(clue.question);
    } else if (clue.showing === "question") {
        clue.showing = "answer";
        $cell.text(clue.answer);
    } // if "answer", do nothing
}

// Show the loading spinner
function showLoadingView() {
    $("#jeopardy").empty();
    $("#spinner").show();
    $("#restart").prop("disabled", true).text("Loading...");
}

// Hide the loading spinner
function hideLoadingView() {
    $("#spinner").hide();
    $("#restart").prop("disabled", false).text("Restart");
}

// Start up game
async function setupAndStart() {
    showLoadingView();

    try {
        const ids = await getCategoryIds();
        const catPromises = ids.map((id) => getCategory(id));
        categories = await Promise.all(catPromises);

        await fillTable();
    } catch (err) {
        console.error(err);
        alert("Failed to load game data. Please try again.");
    } finally {
        hideLoadingView();
    }
}

// restart button
$("#restart").on("click", setupAndStart);

// Clue click
$("#jeopardy").on("click", "td", handleClick);

// Auto-start on load
$(setupAndStart);
