const API_KEY = "";

let playerLives = 5;
let aiLives = 5;
let aiWords = [];
let playerWords = [];
let lastAiWord = "";

async function submitWord() {
	const playerInput = document.getElementById("player-input").value;

	//Checking if the player's word is valid through an API
	const isValid = await validatePlayerWord(playerInput);

	if (!isValid) {
		playerLives--;
		updateGameInfo();
		document.getElementById("feedback").textContent =
			"Invalid word! You lost a life.";
		return;
	}

	// Checking if the word has already been used.
	if (aiWords.includes(playerInput) || playerWords.includes(playerInput)) {
		document.getElementById("feedback").textContent =
			"Word has already been used! Try another.";
		return;
	}

	// Checking if the player's word contains the last two letters of the AI's word.
	if (lastAiWord && !playerInput.startsWith(lastAiWord.slice(-2))) {
		playerLives--;
		updateGameInfo();
		document.getElementById("feedback").textContent =
			"Your word must start with the last two letters of AI's word! You lost a life.";
		return;
	}

	playerWords.push(playerInput);
	updatePlayerWords();

	// Allowing the AI to attempt to find a valid word.
	const aiSuccess = await aiTryToFindWord(playerInput.slice(-2));
	if (!aiSuccess) {
		lastAiWord = "";
		document.getElementById("feedback").textContent =
			"AI couldn't find a valid word. Your turn!";
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	document.getElementById("player-input").value = "";
	document.getElementById("feedback").textContent = "";
}

addEventListener("keydown", function (e) {
	if (e.key === "Enter") {
		submitWord();
	}
});

async function aiTryToFindWord(lastPlayerLetters) {
	let attempts = 2;
	let aiWord;

	while (attempts > 0) {
		// Displaying the message that the AI is thinking for each attempt.
		document.getElementById("feedback").textContent = "AI is thinking...";
		await new Promise((resolve) => setTimeout(resolve, 2000));

		aiWord = await getAIWord(lastPlayerLetters);

		// Checking if the AI's word is valid.
		if (aiWord) {
			aiWords.push(aiWord);
			lastAiWord = aiWord;
			updateUsedWords();
			document.getElementById("ai-word").textContent = aiWord;
			return true;
		}

		attempts--;
		aiLives--;

		if (aiLives <= 0) {
			updateGameInfo();
			document.getElementById("feedback").textContent =
				"Congratulations! You defeated the AI!";
			await new Promise((resolve) => setTimeout(resolve, 2000));
			endGame();
			return false;
		} else {
			document.getElementById("feedback").textContent =
				"AI lost a life for an invalid word! Trying again...";
		}

		updateGameInfo();
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	return false;
}

async function getAIWord(lastTwoLetters, customPrompt = null) {
	const allUsedWords = [...aiWords, ...playerWords].join(", ");

	const prompt = customPrompt
		? customPrompt
		: `Provide a single, complete English word that starts exactly with "${lastTwoLetters}" (no additional letters before these). Ensure the word is valid in English, has at least 3 letters, and is not an abbreviation. If no such word exists, respond only with "Word not found". Avoid additional text, explanations, or these words: ${allUsedWords}.`;

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${API_KEY}`,
		},
		body: JSON.stringify({
			model: "gpt-3.5-turbo",
			messages: [{ role: "user", content: prompt }],
			max_tokens: 10,
		}),
	});

	const data = await response.json();
	let aiResponse = data.choices[0].message.content.trim();
	//console.log(aiResponse);

	aiResponse = aiResponse.replace(/[.,!?;:]*$/, "");
	if (aiResponse.toLowerCase() === "word not found") {
		return null;
	}

	// Extracting the first word and checking if it has at least 3 letters and is complete.
	const aiWord = aiResponse.split(/\s+/)[0];
	if (aiWord.length < 3 || !/^[a-zA-Z]+$/.test(aiWord)) {
		return null;
	}
	return aiWord;
}

// The function that validates the player's word.
async function validatePlayerWord(playerWord) {
	const prompt = `Is "${playerWord}" a valid English word? Answer with "Yes" or "No" only.`;

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${API_KEY}`,
		},
		body: JSON.stringify({
			model: "gpt-3.5-turbo",
			messages: [{ role: "user", content: prompt }],
			max_tokens: 5,
		}),
	});

	const data = await response.json();
	const validationResponse = data.choices[0].message.content.trim();

	return validationResponse.toLowerCase() === "yes";
}

function updateGameInfo() {
	document.getElementById("player-lives").textContent = playerLives;
	document.getElementById("ai-lives").textContent = aiLives;

	if (playerLives <= 0) {
		document.getElementById("feedback").textContent = "Game Over!";
		endGame();
	}
}

function updateUsedWords() {
	const usedWordsList = document.getElementById("used-words");
	usedWordsList.innerHTML = "";
	aiWords.forEach((word) => {
		const listItem = document.createElement("li");
		listItem.textContent = word;
		usedWordsList.appendChild(listItem);
	});
}

function updatePlayerWords() {
	const playerWordsList = document.getElementById("player-words");
	playerWordsList.innerHTML = "";
	playerWords.forEach((word) => {
		const listItem = document.createElement("li");
		listItem.textContent = word;
		playerWordsList.appendChild(listItem);
	});
}

function giveUp() {
	playerLives = 0;
	document.getElementById("feedback").textContent = "You gave up!";
	endGame();
	updateGameInfo();
}

function endGame() {
	document.getElementById("give-up").style.display = "none";
	document.getElementById("restart").style.display = "inline";
	document.getElementById("player-input").disabled = true;
	document.getElementById("submit").disabled = true;
}

function restartGame() {
	playerLives = 5;
	aiLives = 5;
	aiWords = [];
	playerWords = [];
	lastAiWord = "";
	document.getElementById("player-lives").textContent = playerLives;
	document.getElementById("ai-lives").textContent = aiLives;
	document.getElementById("feedback").textContent = "";
	document.getElementById("ai-word").textContent = "";
	document.getElementById("player-input").value = "";
	document.getElementById("player-input").disabled = false;
	document.getElementById("submit").disabled = false;
	document.getElementById("restart").style.display = "none";
	document.getElementById("give-up").style.display = "inline";
	document.getElementById("used-words").innerHTML = "";
	updatePlayerWords();
}

updateGameInfo();
