// Popup script for Honey Barrel extension

// Function to create a match item element with enhanced details
function createMatchItem(match, currentPrice) {
    const matchItem = document.createElement('div');
    matchItem.className = 'match-item';
    
    // Create a background element if blurhash is available
    if (match.blurhash) {
      const blurhashBg = document.createElement('div');
      blurhashBg.className = 'blurhash-bg';
      blurhashBg.style.backgroundColor = '#f9f6f2'; // Fallback
      matchItem.appendChild(blurhashBg);
    }
   
    
    // Create the main content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'match-content';
    
    // Create the header with image and details
    const headerDiv = document.createElement('div');
    headerDiv.className = 'match-header';
    
    // Add image if available
    if (match.imageUrl) {
      const img = document.createElement('img');
      img.className = 'match-image';
      img.src = match.imageUrl;
      img.alt = match.name;
      img.onerror = function() {
        this.onerror = null;
        this.src = 'images/bottle-placeholder.png'; // Fallback image
      };
      headerDiv.appendChild(img);
    }
    
    // Add details
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'match-details';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'match-name';
    nameDiv.textContent = match.name;
    detailsDiv.appendChild(nameDiv);
    
    if (match.spiritType) {
      const typeDiv = document.createElement('div');
      typeDiv.className = 'match-type';
      typeDiv.textContent = match.spiritType;
      detailsDiv.appendChild(typeDiv);
    }
    
    if (match.region || match.country) {
      const regionDiv = document.createElement('div');
      regionDiv.className = 'match-region';
      
      // Location icon
      regionDiv.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/>
          <path d="M10 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/>
        </svg>
      `;
      
      const locationText = document.createTextNode(
        [match.region, match.country].filter(Boolean).join(', ')
      );
      regionDiv.appendChild(locationText);
      
      detailsDiv.appendChild(regionDiv);
    }
    
    headerDiv.appendChild(detailsDiv);
    contentDiv.appendChild(headerDiv);
    
    // Create price comparison
    const priceCompareDiv = document.createElement('div');
    priceCompareDiv.className = 'price-compare';
    
    // Current price
    const currentPriceDiv = document.createElement('div');
    currentPriceDiv.className = 'price-compare-item';
    currentPriceDiv.innerHTML = `
      <div class="price-label">Current Site</div>
      <div class="price-value">$${currentPrice.toFixed(2)}</div>
    `;
    priceCompareDiv.appendChild(currentPriceDiv);
    
    // BAXUS price
    const baxusPriceDiv = document.createElement('div');
    baxusPriceDiv.className = 'price-compare-item';
    baxusPriceDiv.innerHTML = `
      <div class="price-label">BAXUS</div>
      <div class="price-value">$${match.price.toFixed(2)}</div>
    `;
    priceCompareDiv.appendChild(baxusPriceDiv);
    
    contentDiv.appendChild(priceCompareDiv);
    
    // Calculate and display savings
    const priceDiff = match.price - currentPrice;
    let savingsHtml = '';
    
    if (priceDiff < 0) {
      // Savings on BAXUS
      savingsHtml = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="8 9 12 5 16 9"></polyline>
          <line x1="12" y1="5" x2="12" y2="19"></line>
        </svg>
        Save $${Math.abs(priceDiff).toFixed(2)} on BAXUS!
      `;
    } else if (priceDiff === 0) {
      savingsHtml = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        Same price on both platforms
      `;
    } else {
      // Better price here
      savingsHtml = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="8 15 12 19 16 15"></polyline>
          <line x1="12" y1="19" x2="12" y2="5"></line>
        </svg>
        Check this out!
      `;
    }
    
    const savingsDiv = document.createElement('div');
    savingsDiv.className = 'savings';
    savingsDiv.innerHTML = savingsHtml;
    contentDiv.appendChild(savingsDiv);
    
    // Add link to BAXUS
    const viewBtn = document.createElement('a');
    viewBtn.href = `https://baxus.co/asset/${match.id}`;
    viewBtn.className = 'view-btn';
    viewBtn.target = '_blank';
    viewBtn.innerHTML = `
      View on BAXUS
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14"></path>
        <path d="m12 5 7 7-7 7"></path>
      </svg>
    `;
    contentDiv.appendChild(viewBtn);
    
    matchItem.appendChild(contentDiv);
    return matchItem;
  }
  
  // Function to show "no matches" content
  function showNoMatches() {
    const matchesContainer = document.querySelector('.matches');
    
    matchesContainer.innerHTML = `
      <div class="no-matches">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 15h8"></path>
          <path d="M9 9h.01"></path>
          <path d="M15 9h.01"></path>
        </svg>
        <p>No matching bottles found on BAXUS marketplace</p>
      </div>
    `;
  }
  
  // Function to update popup status
  function updateStatus(message, type = 'loading') {
    const statusElement = document.querySelector('.status');
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
  }
  
  // Function to update popup content
  function updatePopupContent(matches, currentPrice) {
    const matchesContainer = document.querySelector('.matches');
    
    // Hide loading indicator
    document.querySelector('.loading-container').style.display = 'none';
    
    if (!matches || matches.length === 0) {
      updateStatus('No matches found', 'error');
      showNoMatches();
      return;
    }
    
    updateStatus(`Found ${matches.length} matching bottle${matches.length > 1 ? 's' : ''}`, 'success');
    matchesContainer.innerHTML = '';
    
    // Add each match with a slight delay for animation
    matches.forEach((match, index) => {
      setTimeout(() => {
        matchesContainer.appendChild(createMatchItem(match, currentPrice));
      }, index * 100);
    });
  }
  
  // Function to handle errors
  function handleError(message) {
    updateStatus(message || 'An error occurred', 'error');
    document.querySelector('.loading-container').style.display = 'none';
    showNoMatches();
  }
  
  // Execute when popup loads
  document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup opened");
    updateStatus('Checking current page...', 'loading');
    
    // Query the active tab to get current bottle information
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const activeTab = tabs[0];
      console.log("Active tab:", activeTab.url);
      
      if (!activeTab) {
        handleError('Cannot access current tab');
        return;
      }
      
      // Check if we're on a supported site
      chrome.tabs.sendMessage(activeTab.id, { type: 'GET_BOTTLE_INFO' }, response => {
        if (chrome.runtime.lastError) {
          handleError('Cannot access page content');
          return;
        }
        
        console.log("Response from content script:", response);
        
        if (!response || !response.bottleInfo) {
          handleError('No bottle detected on this page');
          return;
        }
        
        const { bottleName, price } = response.bottleInfo;
        updateStatus(`Found: ${bottleName}`, 'loading');
        
        // Search for matches using the background script
        chrome.runtime.sendMessage(
          { type: 'SEARCH_BOTTLE', bottleName },
          response => {
            console.log("Search response:", response);
            if (response && response.matches) {
              updatePopupContent(response.matches, price);
            } else {
              const errorMsg = response && response.error ? response.error : 'Failed to search bottles';
              handleError(errorMsg);
            }
          }
        );
      });
    });
  });