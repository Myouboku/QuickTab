document.addEventListener('DOMContentLoaded', () => {
  const tabsList = document.getElementById('tabs-list');
  const searchInput = document.getElementById('search-input');
  let selectedTabElement = null;
  let originalTabs = []; // Store original tabs

  // Function to normalize text (remove accents and convert to lowercase)
  function normalizeText(text) {
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics
  }

  // Character equivalence map for common French accents
  // Might not include every single character, but it should be enough coverage
  const charEquivalents = {
    'e': ['e', 'é', 'è', 'ê', 'ë'],
    'a': ['a', 'à', 'â', 'ä'],
    'i': ['i', 'î', 'ï'],
    'u': ['u', 'ù', 'û', 'ü'],
    'o': ['o', 'ô', 'ö', 'œ'],
    'c': ['c', 'ç'],
    'y': ['y', 'ÿ']
  };

  // Function to check if characters match, including accents
  function charsMatch(char1, char2) {
    const c1 = normalizeText(char1);
    const c2 = normalizeText(char2);
    
    // Direct match after normalization
    if (c1 === c2) return true;

    // Check equivalence groups
    for (const [base, equivalents] of Object.entries(charEquivalents)) {
      if ((equivalents.includes(c1) || c1 === base) && 
          (equivalents.includes(c2) || c2 === base)) {
        return true;
      }
    }

    return false;
  }

  // Function to perform fuzzy search for a single pattern
  function fuzzySearchSingle(text, pattern) {
    const text_lower = text.toLowerCase();
    const pattern_lower = pattern.toLowerCase();
    
    if (pattern_lower.length === 0) return { matches: true, score: 0 };
    if (pattern_lower.length > text_lower.length) return { matches: false, score: 0 };

    let score = 0;
    let pattern_idx = 0;
    let last_match_idx = -1;
    let first_match_idx = -1;
    let consecutive_matches = 0;

    // Try to match all pattern characters in order
    for (let i = 0; i < text_lower.length && pattern_idx < pattern_lower.length; i++) {
      if (charsMatch(text_lower[i], pattern_lower[pattern_idx])) {
        // First match
        if (first_match_idx === -1) first_match_idx = i;
        
        // Consecutive matches get bonus points
        if (last_match_idx === i - 1) {
          consecutive_matches++;
          score += consecutive_matches * 2;
        } else {
          consecutive_matches = 1;
          score += 1;
        }

        last_match_idx = i;
        pattern_idx++;
      }
    }

    // Calculate final score based on various factors
    if (pattern_idx === pattern_lower.length) {
      // Prefer matches at word boundaries
      if (first_match_idx === 0 || text_lower[first_match_idx - 1] === ' ') {
        score += pattern_lower.length * 3;
      }
      
      // Prefer matches closer to the start
      score -= first_match_idx * 0.15;
      
      // Prefer shorter overall matches
      score -= (last_match_idx - first_match_idx) * 0.08;
      
      // Significant bonus for exact substring matches
      const normalized_text = normalizeText(text);
      const normalized_pattern = normalizeText(pattern_lower);
      if (normalized_text.includes(normalized_pattern)) {
        score += pattern_lower.length * 4;
      }
      
      return { 
        matches: true, 
        score: score 
      };
    }

    return { matches: false, score: 0 };
  }

  // Function to perform multi-pattern fuzzy search
  function fuzzySearch(text, searchText) {
    // Split search text into patterns, filtering out empty strings
    const patterns = searchText.split(/\s+/).filter(p => p.length > 0);
    
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
      score: totalScore
    };
  }

  // Function to select a tab
  function selectTab(tabElement) {
    if (selectedTabElement) {
      selectedTabElement.classList.remove('tab-item-selected');
    }
    selectedTabElement = tabElement;
    if (tabElement) {
      tabElement.classList.add('tab-item-selected');
      
      // Wait for next frame to ensure dimensions are calculated
      requestAnimationFrame(() => {
        const container = document.getElementById('tabs-container');
        const list = document.getElementById('tabs-list');
        
        // Get element position relative to list top
        const elementTop = tabElement.offsetTop;
        
        // Get viewport height
        const viewportHeight = container.clientHeight;
        
        // Calculate ideal position to center the element
        const targetScroll = Math.max(0, elementTop - (viewportHeight / 2) + (tabElement.offsetHeight / 2));
        
        // Apply smooth scrolling
        container.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      });
    }
  }

  // Function to highlight matching characters
  function highlightMatches(text, searchText) {
    if (!searchText) return text;
    
    const patterns = searchText.split(/\s+/).filter(p => p.length > 0);
    let positions = new Set();

    patterns.forEach(pattern => {
      let text_lower = text.toLowerCase();
      let pattern_lower = pattern.toLowerCase();
      let pattern_idx = 0;

      for (let i = 0; i < text_lower.length && pattern_idx < pattern_lower.length; i++) {
        if (charsMatch(text_lower[i], pattern_lower[pattern_idx])) {
          positions.add(i);
          pattern_idx++;
        }
      }
    });

    // Convert text to array to handle multi-byte characters
    let chars = [...text];
    positions = Array.from(positions).sort((a, b) => b - a);
    
    positions.forEach(pos => {
      chars[pos] = `<span class="highlight">${chars[pos]}</span>`;
    });

    return chars.join('');
  }

  // Get all open tabs
  chrome.tabs.query({ currentWindow: true }).then(tabs => {
    // Find the active tab
    const activeTab = tabs.find(tab => tab.active);

    tabs.forEach((tab) => {
      const tabElement = document.createElement('div');
      tabElement.className = 'tab-item';
      
      const favicon = document.createElement('img');
      favicon.className = 'tab-favicon';
      favicon.src = tab.favIconUrl || 'default-favicon.png';
      
      const title = document.createElement('span');
      title.className = 'tab-title';
      title.textContent = tab.title;

      tabElement.appendChild(favicon);
      tabElement.appendChild(title);

      // Add click handler to switch to the tab
      tabElement.addEventListener('click', () => {
        chrome.tabs.update(tab.id, { active: true });
        window.close();
      });

      // Store in original tabs array
      originalTabs.push({
        element: tabElement,
        title: tab.title
      });

      tabsList.appendChild(tabElement);

      // Select the active tab
      if (tab.id === activeTab.id) selectTab(tabElement);
    });

    // Focus on the search input
    searchInput.focus();
  });

  // Function to filter tabs
  function filterTabs(searchText) {
    let matchedTabs = [];
    
    originalTabs.forEach(({element, title}) => {
      if (!searchText.trim()) {
        // If no search query, keep all tabs in their original order
        matchedTabs.push({
          element,
          score: 0,
          title
        });
      } else {
        // If search is active, filter and score the tabs
        const {matches, score} = fuzzySearch(title, searchText);
        if (matches) {
          matchedTabs.push({ 
            element, 
            score,
            title
          });
        }
      }
    });

    // Sort by score only if there's an active search
    if (searchText.trim()) {
      matchedTabs.sort((a, b) => b.score - a.score);
    }

    // Clear the tabs list
    while (tabsList.firstChild) {
      tabsList.removeChild(tabsList.firstChild);
    }

    // Show matched tabs in their new order
    if (matchedTabs.length === 0) {
      const noResultsElement = document.createElement('div');
      noResultsElement.className = 'no-results';
      noResultsElement.textContent = 'No results :(';
      noResultsElement.style.cssText = 'text-align: center; padding: 20px; color: #666; font-style: italic;';
      tabsList.appendChild(noResultsElement);
    } else {
      matchedTabs.forEach(({ element, title }) => {
        const titleElement = element.querySelector('.tab-title');
        titleElement.innerHTML = searchText.trim() ? highlightMatches(title, searchText) : title;
        // Append the element in its new position
        tabsList.appendChild(element);
    });

      // Select the first tab if available
      selectTab(matchedTabs[0].element);
    }
  }

  // Handle search
  searchInput.addEventListener('input', (e) => {
    filterTabs(e.target.value);
  });

  // Handle keyboard navigation
  document.addEventListener('keydown', (e) => {
    const visibleItems = Array.from(document.querySelectorAll('.tab-item:not(.hidden)'));
    const currentIndex = visibleItems.indexOf(selectedTabElement);

    switch(e.key) {
      case 'Tab':
        // Block Tab key
        e.preventDefault();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (visibleItems.length > 0) {
          const nextIndex = (currentIndex + 1) % visibleItems.length;
          selectTab(visibleItems[nextIndex]);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (visibleItems.length > 0) {
          const prevIndex = (currentIndex - 1 + visibleItems.length) % visibleItems.length;
          selectTab(visibleItems[prevIndex]);
        }
        break;
      case 'Enter':
        if (selectedTabElement) selectedTabElement.click();
        break;
    }
  });
}); 