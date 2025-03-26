document.addEventListener("DOMContentLoaded", () => {
  const tabsList = document.getElementById("tabs-list");
  const searchInput = document.getElementById("search-input");
  let selectedTabElement = null;
  let originalTabs = [];
  let lastSearch = null;

  // Restore last search
  chrome.storage.local.get(["lastSearch"], (result) => {
    if (result.lastSearch) {
      lastSearch = result.lastSearch;
      searchInput.value = lastSearch;
      searchInput.select();
    }
  });

  // Function to normalize text (remove accents and convert to lowercase)
  function normalizeText(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics
  }

  // Character equivalence map for common accents
  // Might not include every single character, but it should be enough coverage
  const charEquivalents = {
    e: ["e", "é", "è", "ê", "ë"],
    a: ["a", "à", "â", "ä"],
    i: ["i", "î", "ï"],
    u: ["u", "ù", "û", "ü"],
    o: ["o", "ô", "ö", "œ"],
    c: ["c", "ç"],
    y: ["y", "ÿ"],
  };

  // Function to check if characters match, including accents
  function charsMatch(char1, char2) {
    const c1 = normalizeText(char1);
    const c2 = normalizeText(char2);

    // Direct match after normalization
    if (c1 === c2) return true;

    // Check equivalence groups
    for (const [base, equivalents] of Object.entries(charEquivalents)) {
      if (
        (equivalents.includes(c1) || c1 === base) &&
        (equivalents.includes(c2) || c2 === base)
      ) {
        return true;
      }
    }

    return false;
  }

  // Function to perform fuzzy search for a single pattern
  function fuzzySearchSingle(text, pattern) {
    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();

    if (patternLower.length === 0) return { matches: true, score: 0 };
    if (patternLower.length > textLower.length)
      return { matches: false, score: 0 };

    let score = 0;
    let patternIdx = 0;
    let lastMatchIdx = -1;
    let firstMatchIdx = -1;
    let consecutiveMatches = 0;

    // Try to match all pattern characters in order
    for (
      let i = 0;
      i < textLower.length && patternIdx < patternLower.length;
      i++
    ) {
      if (charsMatch(textLower[i], patternLower[patternIdx])) {
        if (firstMatchIdx === -1) firstMatchIdx = i;

        // Consecutive matches get bonus points
        if (lastMatchIdx === i - 1) {
          consecutiveMatches++;
          score += consecutiveMatches * 2;
        } else {
          consecutiveMatches = 1;
          score += 1;
        }

        lastMatchIdx = i;
        patternIdx++;
      }
    }

    // Calculate final score based on various factors
    if (patternIdx === patternLower.length) {
      // Prefer matches at word boundaries
      if (firstMatchIdx === 0 || textLower[firstMatchIdx - 1] === " ") {
        score += patternLower.length * 3;
      }

      // Prefer matches closer to the start
      score -= firstMatchIdx * 0.15;

      // Prefer shorter overall matches
      score -= (lastMatchIdx - firstMatchIdx) * 0.08;

      // Significant bonus for exact substring matches
      const normalizedText = normalizeText(text);
      const normalizedPattern = normalizeText(patternLower);
      if (normalizedText.includes(normalizedPattern)) {
        score += patternLower.length * 4;
      }

      return {
        matches: true,
        score: score,
      };
    }

    return { matches: false, score: 0 };
  }

  // Function to perform multi-pattern fuzzy search
  function fuzzySearch(text, searchText) {
    // Split search text into patterns, filtering out empty strings
    const patterns = searchText.split(/\s+/).filter((p) => p.length > 0);

    if (patterns.length === 0) return { matches: true, score: 0 };

    // Try to match each pattern
    let totalScore = 0;
    for (const pattern of patterns) {
      const result = fuzzySearchSingle(text, pattern);
      if (!result.matches) {
        return { matches: false, score: 0 };
      }
      totalScore += result.score;
    }

    // Bonus points for matching all patterns
    totalScore += patterns.length * 2;

    return {
      matches: true,
      score: totalScore,
    };
  }

  // Function to select a tab
  function selectTab(tabElement) {
    if (selectedTabElement) {
      selectedTabElement.classList.remove("tab-item-selected");
    }
    selectedTabElement = tabElement;
    if (tabElement) {
      tabElement.classList.add("tab-item-selected");

      // Save current search
      chrome.storage.local.set({ lastSearch: searchInput.value });

      // Wait for next frame to ensure dimensions are calculated
      requestAnimationFrame(() => {
        const container = document.getElementById("tabs-container");

        // Get element position relative to list top
        const elementTop = tabElement.offsetTop;

        // Get viewport height
        const viewportHeight = container.clientHeight;

        // Calculate ideal position to center the element
        const targetScroll = Math.max(
          0,
          elementTop - viewportHeight / 2 + tabElement.offsetHeight / 2
        );

        // Apply smooth scrolling
        container.scrollTo({
          top: targetScroll,
          behavior: "smooth",
        });
      });
    }
  }

  // Function to highlight matching characters
  function highlightMatches(text, searchText) {
    if (!searchText) return text;

    const patterns = searchText.split(/\s+/).filter((p) => p.length > 0);
    let positions = new Set();

    patterns.forEach((pattern) => {
      let textLower = text.toLowerCase();
      let patternLower = pattern.toLowerCase();
      let patternIdx = 0;

      for (
        let i = 0;
        i < textLower.length && patternIdx < patternLower.length;
        i++
      ) {
        if (charsMatch(textLower[i], patternLower[patternIdx])) {
          positions.add(i);
          patternIdx++;
        }
      }
    });

    // Convert text to array to handle multi-byte characters
    let chars = [...text];
    positions = Array.from(positions).sort((a, b) => a - b);

    // Group positions into ranges
    let ranges = [];
    let currentRange = null;
    positions.forEach((pos) => {
      if (currentRange === null) {
        currentRange = { start: pos, end: pos };
      } else if (pos === currentRange.end + 1) {
        currentRange.end = pos;
      } else {
        ranges.push(currentRange);
        currentRange = { start: pos, end: pos };
      }
    });
    if (currentRange !== null) {
      ranges.push(currentRange);
    }

    // Apply highlights starting from the end to avoid index issues
    ranges.reverse().forEach(({ start, end }) => {
      const highlightedText = chars.slice(start, end + 1).join("");
      chars.splice(
        start,
        end - start + 1,
        `<span class="highlight">${highlightedText}</span>`
      );
    });

    return chars.join("");
  }

  // Get all open tabs
  chrome.tabs.query({ currentWindow: true }).then((tabs) => {
    const activeTab = tabs.find((tab) => tab.active);

    tabs.forEach((tab) => {
      const tabElement = document.createElement("div");
      tabElement.className = "tab-item";

      const faviconContainer = document.createElement("div");
      faviconContainer.className = "tab-favicon";

      if (tab.favIconUrl) {
        const favicon = document.createElement("img");
        // Can't get the favicon for about:addons for some reason
        if (tab.url === "about:addons") {
          favicon.src = "chrome://global/skin/icons/settings.svg";
        } else {
          favicon.src = tab.favIconUrl;
        }
        favicon.style.width = "100%";
        favicon.style.height = "100%";
        faviconContainer.appendChild(favicon);
      }

      tabElement.appendChild(faviconContainer);

      const title = document.createElement("span");
      title.className = "tab-title";
      title.textContent = tab.title;

      tabElement.appendChild(title);

      // Add audio indicator if the tab is playing audio or is muted
      if (tab.audible || tab.mutedInfo?.muted) {
        const audioIndicator = document.createElement("div");
        audioIndicator.className =
          "audio-indicator" + (tab.mutedInfo?.muted ? " muted" : "");
        tabElement.appendChild(audioIndicator);
      }

      // Add click handler to switch to the tab
      tabElement.addEventListener("click", () => {
        chrome.tabs.update(tab.id, { active: true });
        window.close();
      });

      // Store in original tabs array
      originalTabs.push({
        element: tabElement,
        title: tab.title,
        tabData: tab, // Store the full tab data
      });

      tabsList.appendChild(tabElement);

      // Select the active tab
      if (tab.id === activeTab.id) selectTab(tabElement);
    });

    // Focus on the search input
    searchInput.focus();

    // Filter tabs with last search if it exists
    if (lastSearch) filterTabs(lastSearch);
  });

  // Function to filter tabs
  function filterTabs(searchText) {
    let matchedTabs = [];
    const specialCommands = searchText.match(/@\w+/g) || [];
    const textWithoutCommands = searchText.replace(/@\w+/g, "").trim();

    originalTabs.forEach(({ element, title, tabData }) => {
      let matches = true;

      // Handle special commands
      specialCommands.forEach((command) => {
        switch (command.toLowerCase()) {
          case "@audio":
            if (!(tabData.audible || tabData.mutedInfo?.muted)) {
              matches = false;
            }
            break;
          case "@pinned":
            if (!tabData.pinned) {
              matches = false;
            }
            break;
          case "@url":
            // If @url is specified, search in URLs instead of titles
            if (
              textWithoutCommands &&
              !fuzzySearch(tabData.url, textWithoutCommands).matches
            ) {
              matches = false;
            }
            break;
        }
      });

      // If no text search and no special commands, show all tabs
      if (!textWithoutCommands && specialCommands.length === 0) {
        matchedTabs.push({
          element,
          score: 0,
          title,
          tabData,
        });
      }
      // Otherwise, apply text search if there is any text to search
      else if (matches) {
        const searchTarget = specialCommands.includes("@url")
          ? tabData.url
          : title;
        if (
          !textWithoutCommands ||
          fuzzySearch(searchTarget, textWithoutCommands).matches
        ) {
          const score = textWithoutCommands
            ? fuzzySearch(searchTarget, textWithoutCommands).score
            : 0;
          matchedTabs.push({
            element,
            score,
            title,
            tabData,
          });
        }
      }
    });

    // Sort by score only if there's a text search
    if (textWithoutCommands) matchedTabs.sort((a, b) => b.score - a.score);

    // Clear the tabs list
    while (tabsList.firstChild) tabsList.removeChild(tabsList.firstChild);

    // Show matched tabs in their new order
    if (matchedTabs.length === 0) {
      const noResultsElement = document.createElement("div");
      noResultsElement.className = "no-results";
      noResultsElement.textContent = "No results :(";
      noResultsElement.style.cssText =
        "text-align: center; padding: 20px; color: var(--no-results-color); font-style: italic;";
      tabsList.appendChild(noResultsElement);
    } else {
      matchedTabs.forEach(({ element, title, tabData }) => {
        const titleElement = element.querySelector(".tab-title");
        const isUrlSearch = specialCommands.includes("@url");
        const displayText = isUrlSearch ? tabData.url : title;
        titleElement.innerHTML = textWithoutCommands
          ? highlightMatches(displayText, textWithoutCommands)
          : displayText;
        tabsList.appendChild(element);
      });

      // Select the first tab if available
      selectTab(matchedTabs[0].element);
    }
  }

  // Handle search
  searchInput.addEventListener("input", (e) => {
    filterTabs(e.target.value);
  });

  // Handle keyboard navigation
  document.addEventListener("keydown", (e) => {
    const visibleItems = Array.from(
      document.querySelectorAll(".tab-item:not(.hidden)")
    );
    const currentIndex = visibleItems.indexOf(selectedTabElement);
    let searchText,
      commandMatch,
      partialCommand,
      availableCommands,
      matchingCommand,
      newText;

    switch (e.key) {
      case "Tab":
        e.preventDefault();
        // Handle command autocompletion
        searchText = searchInput.value;
        commandMatch = searchText.match(/@(\w*)$/);

        if (commandMatch) {
          partialCommand = commandMatch[1].toLowerCase();
          availableCommands = ["pinned", "audio", "url"];
          matchingCommand = availableCommands.find((cmd) =>
            cmd.startsWith(partialCommand)
          );

          if (matchingCommand) {
            newText =
              searchText.slice(0, -partialCommand.length) + matchingCommand;
            searchInput.value = newText;
            filterTabs(newText);
          }
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (visibleItems.length > 0) {
          const nextIndex = (currentIndex + 1) % visibleItems.length;
          selectTab(visibleItems[nextIndex]);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (visibleItems.length > 0) {
          const prevIndex =
            (currentIndex - 1 + visibleItems.length) % visibleItems.length;
          selectTab(visibleItems[prevIndex]);
        }
        break;
      case "Enter":
        if (selectedTabElement) selectedTabElement.click();
        break;
    }
  });
});
