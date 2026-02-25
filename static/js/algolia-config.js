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
    // Normalize to pathname for comparison
    var path;
    try { path = new URL(url).pathname; } catch (_) { path = url; }
    var match = localIndex.find(function (item) {
      var itemPath;
      try { itemPath = new URL(item.link || item.permalink).pathname; } catch (_) { itemPath = item.link || item.permalink; }
      return itemPath === path;
    });
    return match || {};
  }

  // Extract section from a URL path, e.g. /posts/foo/ -> "posts"
  function sectionFromURL(url) {
    try {
      var p = new URL(url).pathname;
      var parts = p.replace(/^\//, "").split("/");
      return parts.length > 1 ? parts[0] : "";
    } catch (_) {
      return "";
    }
  }

  // Extract the best title from a DocSearch hit's hierarchy
  function titleFromHit(hit) {
    var h = hit.hierarchy || {};
    // Use the deepest non-null heading as title
    for (var i = 6; i >= 1; i--) {
      if (h["lvl" + i]) return h["lvl" + i];
    }
    return h.lvl0 || "(untitled)";
  }

  // Extract highlighted title from a DocSearch hit
  function highlightedTitleFromHit(hit) {
    var hr = hit._highlightResult && hit._highlightResult.hierarchy;
    if (!hr) return null;
    for (var i = 6; i >= 1; i--) {
      var lvl = hr["lvl" + i];
      if (lvl && lvl.value) return lvl.value;
    }
    return hr.lvl0 ? hr.lvl0.value : null;
  }

  // Deduplicate hits: keep only one entry per base page (url_without_anchor),
  // preferring lvl1 (page-level) hits over deeper sub-sections
  function deduplicateHits(hits) {
    var seen = {};
    var result = [];
    hits.forEach(function (hit) {
      var base = hit.url_without_anchor || hit.url || "";
      if (!seen[base]) {
        seen[base] = true;
        result.push(hit);
      }
    });
    return result;
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

    try {
      // DocSearch indices lack a "section" facet, so query without facetFilters
      // and filter client-side by URL path instead
      const { hits } = await index.search(query, {
        hitsPerPage: 50,
        attributesToRetrieve: [
          "url",
          "url_without_anchor",
          "anchor",
          "content",
          "hierarchy",
          "type",
        ],
        attributesToSnippet: ["content:30"],
      });

      // Client-side section filter based on URL path
      var filtered = hits.filter(function (hit) {
        var section = sectionFromURL(hit.url || "");
        return selectedSections.indexOf(section) !== -1;
      });

      var unique = deduplicateHits(filtered);

      const results = unique.map(function (hit) {
        var url = hit.url_without_anchor || hit.url || "#";
        var local = findLocalMeta(url);

        return {
          title: highlightedTitleFromHit(hit) || titleFromHit(hit),
          link: url,
          date: local.date || "",
          readingTime: local.readingTime || "?",
          tags: local.tags || [],
          categories: local.categories || [],
          snippet:
            hit._snippetResult && hit._snippetResult.content
              ? hit._snippetResult.content.value
              : hit.content || local.snippet || "",
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

    results.forEach(function (item) {
      var tagsHTML =
        item.tags && item.tags.length > 0
          ? '<div class="taxonomy-group"><strong>Tags:</strong> ' +
            item.tags
              .map(function (tag) {
                return (
                  '<a class="taxonomy-item" href="/tags/' +
                  tag.toLowerCase().replace(/ /g, "-") +
                  '">' +
                  tag +
                  "</a>"
                );
              })
              .join("") +
            "</div>"
          : "";

      var categoriesHTML =
        item.categories && item.categories.length > 0
          ? '<div class="taxonomy-group"><strong>Categories:</strong> ' +
            item.categories
              .map(function (cat) {
                return (
                  '<a class="taxonomy-item" href="/categories/' +
                  cat.toLowerCase().replace(/ /g, "-") +
                  '">' +
                  cat +
                  "</a>"
                );
              })
              .join("") +
            "</div>"
          : "";

      var resultHTML = searchResultTemplate.innerHTML
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

  var debounceTimer;
  searchQuery.addEventListener("keyup", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(executeSearch, 200);
  });
  filterCheckboxes.forEach(function (cb) { cb.addEventListener("change", executeSearch); });
  includeCheckboxes.forEach(function (cb) { cb.addEventListener("change", executeSearch); });

  loadLocalIndex();

  // Handle ?q= parameter
  var urlParams = new URLSearchParams(window.location.search);
  var queryParam = urlParams.get("q") || urlParams.get("search-query");
  if (queryParam) {
    searchQuery.value = queryParam;
    executeSearch();
  }
});
