document.addEventListener("DOMContentLoaded", () => {
  const searchQuery = document.getElementById("search-query");
  const searchResults = document.getElementById("search-results");
  const searchResultTemplate = document.getElementById("search-result-template");
  const filterCheckboxes = document.querySelectorAll("input[name=search-section]");
  const includeCheckboxes = document.querySelectorAll("input[name=search-include]");

  const algoliaConfig = window.__algoliaConfig || {};
  const client = algoliasearch(algoliaConfig.appID, algoliaConfig.apiKey);
  const index = client.initIndex(algoliaConfig.indexName);

  let localIndex = [];
  let isLocalIndexLoaded = false;

  // Load the Hugo JSON index for metadata (tags, categories, readingTime)
  // that may not be in the Algolia index
  async function loadLocalIndex() {
    try {
      const response = await fetch("/index.json");
      if (response.ok) {
        localIndex = await response.json();
        isLocalIndexLoaded = true;
      }
    } catch (_) {
      // Fallback: rely solely on Algolia results
    }
  }

  function findLocalMeta(url) {
    if (!isLocalIndexLoaded) return {};
    const match = localIndex.find(
      (item) => item.link === url || item.permalink === url
    );
    return match || {};
  }

  async function executeSearch() {
    const query = searchQuery.value.trim();
    if (query.length < 2) {
      searchResults.innerHTML = "";
      return;
    }

    const selectedSections = Array.from(filterCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    if (selectedSections.length === 0) {
      renderResults([], query, true);
      return;
    }

    const selectedIncludes = Array.from(includeCheckboxes)
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);

    // Build Algolia facet filters if the index has a "section" attribute
    const facetFilters = selectedSections.map((s) => "section:" + s);

    try {
      const { hits } = await index.search(query, {
        hitsPerPage: 20,
        attributesToRetrieve: [
          "title",
          "url",
          "date",
          "readingTime",
          "tags",
          "categories",
          "snippet",
          "section",
          "content",
          "hierarchy",
        ],
        facetFilters: [facetFilters],
      });

      const results = hits.map((hit) => {
        const url =
          hit.url || hit.permalink || (hit.hierarchy && hit.hierarchy.lvl0) || "#";
        const local = findLocalMeta(url);

        return {
          title:
            hit._highlightResult && hit._highlightResult.title
              ? hit._highlightResult.title.value
              : hit.title || local.title || "(untitled)",
          link: url,
          date: hit.date || local.date || "",
          readingTime: hit.readingTime || local.readingTime || "?",
          tags: hit.tags || local.tags || [],
          categories: hit.categories || local.categories || [],
          snippet:
            hit._snippetResult && hit._snippetResult.content
              ? hit._snippetResult.content.value
              : hit.snippet || local.snippet || "",
        };
      });

      renderResults(results, query);
    } catch (err) {
      console.error("Algolia search failed:", err);
      searchResults.innerHTML =
        '<li class="post-item"><span class="post-title">Search error. Please try again.</span></li>';
    }
  }

  function renderResults(results, query, noSections) {
    searchResults.innerHTML = "";

    if (noSections) {
      searchResults.innerHTML =
        '<li class="post-item"><span class="post-title">Please select a section to search in.</span></li>';
      return;
    }
    if (results.length === 0 && query) {
      searchResults.innerHTML =
        '<li class="post-item"><span class="post-title">No results found for "' +
        query +
        '"</span></li>';
      return;
    }

    results.forEach((item) => {
      const tagsHTML =
        item.tags && item.tags.length > 0
          ? '<div class="taxonomy-group"><strong>Tags:</strong> ' +
            item.tags
              .map(
                (tag) =>
                  '<a class="taxonomy-item" href="/tags/' +
                  tag.toLowerCase().replace(/ /g, "-") +
                  '">' +
                  tag +
                  "</a>"
              )
              .join("") +
            "</div>"
          : "";

      const categoriesHTML =
        item.categories && item.categories.length > 0
          ? '<div class="taxonomy-group"><strong>Categories:</strong> ' +
            item.categories
              .map(
                (cat) =>
                  '<a class="taxonomy-item" href="/categories/' +
                  cat.toLowerCase().replace(/ /g, "-") +
                  '">' +
                  cat +
                  "</a>"
              )
              .join("") +
            "</div>"
          : "";

      const resultHTML = searchResultTemplate.innerHTML
        .replace(/\${link}/g, item.link)
        .replace(/\${title}/g, item.title)
        .replace(/\${date}/g, item.date)
        .replace(/\${readingTime}/g, item.readingTime)
        .replace(/\${snippet}/g, item.snippet)
        .replace(/\${tags}/g, tagsHTML)
        .replace(/\${categories}/g, categoriesHTML);

      searchResults.insertAdjacentHTML("beforeend", resultHTML);
    });
  }

  let debounceTimer;
  searchQuery.addEventListener("keyup", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(executeSearch, 200);
  });
  filterCheckboxes.forEach((cb) => cb.addEventListener("change", executeSearch));
  includeCheckboxes.forEach((cb) => cb.addEventListener("change", executeSearch));

  loadLocalIndex();

  // Handle ?q= parameter
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get("q") || urlParams.get("search-query");
  if (queryParam) {
    searchQuery.value = queryParam;
    executeSearch();
  }
});
