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
const repositoryCache = new Map();
const repositoryRequests = new Map();
const cacheDuration = 5 * 60 * 1000;

function getRepositories(selectedLanguage, githubLanguage) {
    const cachedRepositories = repositoryCache.get(selectedLanguage);

    if (cachedRepositories && Date.now() - cachedRepositories.cachedAt < cacheDuration) {
        return Promise.resolve(cachedRepositories);
    }

    const pendingRequest = repositoryRequests.get(selectedLanguage);
    if (pendingRequest) return pendingRequest;

    const url = `https://api.github.com/search/repositories?q=language:${encodeURIComponent(githubLanguage)}&sort=stars&order=desc&per_page=100`;
    const request = fetch(url, {
        headers: {
            Accept: "application/vnd.github+json"
        }
    }).then(async (response) => {
        if (!response.ok) {
            if (response.status === 403 || response.status === 429) {
                throw new Error(getRateLimitMessage(response));
            }
            throw new Error("Something went wrong.");
        }

        const data = await response.json();
        const repositories = {
            items: Array.isArray(data.items) ? data.items : [],
            cachedAt: Date.now()
        };
        repositoryCache.set(selectedLanguage, repositories);
        return repositories;
    });

    repositoryRequests.set(selectedLanguage, request);
    return request.finally(() => {
        repositoryRequests.delete(selectedLanguage);
    });
}

function getRateLimitMessage(response) {
    const retryAfter = Number(response.headers.get("Retry-After"));

    if (Number.isFinite(retryAfter) && retryAfter > 0) {
        const retryTime = new Date(Date.now() + retryAfter * 1000);
        return `GitHub is temporarily rate limiting requests. Try again after ${retryTime.toLocaleTimeString()}.`;
    }

    const remaining = response.headers.get("X-RateLimit-Remaining");
    const reset = Number(response.headers.get("X-RateLimit-Reset"));

    if (remaining === "0" && Number.isFinite(reset) && reset > 0) {
        return `GitHub API rate limit reached. Try again after ${new Date(reset * 1000).toLocaleTimeString()}.`;
    }

    return "GitHub is temporarily rate limiting requests. Please try again shortly.";
}

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
        const repositories = await getRepositories(selectedLanguage, githubLanguage);

        if (repositories.items.length === 0) {
            message.textContent = `No repositories found for ${githubLanguage}. Try another language.`;
            return;
        }

        const randomIndex = Math.floor(Math.random() * repositories.items.length);
        const randomRepository = repositories.items[randomIndex];

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
        getRepositories(language.value, languageAliases[language.value] || language.value).catch(() => {});
    }
});

language.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        getRepository();
    }
});