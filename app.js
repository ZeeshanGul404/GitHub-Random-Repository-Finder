const language = document.querySelector("#language");
const findButton = document.querySelector("#find-btn");
const message = document.querySelector("#message");
const repository = document.querySelector("#repository");

const languageAliases = {
    javascript: "JavaScript",
    python: "Python",
    java: "Java",
    cpp: "C++",
    php: "PHP",
    typescript: "TypeScript",
    go: "Go",
    rust: "Rust"
};

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let isLoading = false;

async function getRepository() {
    if (isLoading) return;

    const selectedLanguage = language.value;

    if (selectedLanguage === "") {
        message.textContent = "Please select a language.";
        repository.innerHTML = "";
        return;
    }

    const githubLanguage = languageAliases[selectedLanguage] || selectedLanguage;

    isLoading = true;
    findButton.disabled = true;
    message.textContent = "Loading...";
    repository.innerHTML = "";

    try {
        const url = `https://api.github.com/search/repositories?q=language:${encodeURIComponent(githubLanguage)}&sort=stars&order=desc&per_page=100`;

        const response = await fetch(url, {
            headers: {
                Accept: "application/vnd.github+json"
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error("GitHub API rate limit reached. Please try again later.");
            }
            throw new Error("Something went wrong.");
        }

        const data = await response.json();
        const repositories = Array.isArray(data.items) ? data.items : [];

        if (repositories.length === 0) {
            message.textContent = `No repositories found for ${githubLanguage}. Try another language.`;
            return;
        }

        const randomIndex = Math.floor(Math.random() * repositories.length);
        const randomRepository = repositories[randomIndex];

        if (!randomRepository || !randomRepository.full_name) {
            throw new Error("Repository data is incomplete.");
        }

        const repoName = escapeHtml(randomRepository.full_name || "Repository");
        const repoUrl = randomRepository.html_url || "#";
        const description = escapeHtml(randomRepository.description || "No description available.");
        const stars = randomRepository.stargazers_count || 0;
        const forks = randomRepository.forks_count || 0;
        const issues = randomRepository.open_issues_count || 0;

        repository.innerHTML = `
            <div class="repository-card">

                <h2>
                    <a href="${repoUrl}" target="_blank" rel="noopener noreferrer">
                        ${repoName}
                    </a>
                </h2>

                <p class="description">
                    ${description}
                </p>

                <div class="stats">

                    <span class="stat">
                        ⭐ ${stars} Stars
                    </span>

                    <span class="stat">
                        🍴 ${forks} Forks
                    </span>

                    <span class="stat">
                        🐛 ${issues} Issues
                    </span>

                </div>

            </div>
        `;

        message.textContent = "";

    } catch (error) {
        message.textContent = error.message || "Unable to find a repository. Please try again.";
        console.error(error);
    } finally {
        isLoading = false;
        findButton.disabled = false;
    }
}

findButton.addEventListener("click", getRepository);
language.addEventListener("change", () => {
    if (language.value !== "") {
        message.textContent = "";
    }
});

language.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        getRepository();
    }
});