// Content script for Honey Barrel extension

// Configuration for supported retail sites with enhanced selectors
const RETAIL_SITES = {
    // Major wine retailers
    'wine.com': {
      titleSelector: '.pipName, .product-name, h1.product-name, .product-title',
      priceSelector: '.productPrice, .price-wrapper .price, .product-price, .current-price',
      brandSelector: '.pipStoreName, .product-brand, .brand-name, .winery-name',
      regionSelector: '.pipSubTitle, .product-region, .region, .wine-region',
      imageSelector: '.pipContentLeft img, .product-image img, .primary-image, .bottle-shot img',
      vintageSelector: '.vintage, .wine-vintage',
      varietalSelector: '.varietal, .wine-type, .grape-variety'
    },
    'spiritory.com': {
      titleSelector: 'h1, .product-name, .text-breadcrumbs-active',
      priceSelector: '.tw-pt-3.tw-text-3xl.tw-font-medium.tw-text-text, .price',
      brandSelector: '.product-brand, .brand, .rte > p:last-child',
      regionSelector: 'li:nth-of-type(4) span:nth-of-type(2), .region',
      imageSelector: '.tw-pt-4 img'
    },
    'caskcartel.com': {
      titleSelector: '.product-title, .product-name, h3',
      priceSelector: '.price__current, .price',
      brandSelector: '.product-brand, .brand, .rte > p:last-child',
      regionSelector: '.product-region, .region',
      imageSelector: '.product-image'
    },
    'whisky.auction': {
      titleSelector: '.lotName1 .line-1, .product-title .lotName1',
      priceSelector: '.conversion-value, .winningBid',
      brandSelector: '.metawrap p:nth-of-type(1)',
      regionSelector: '.metawrap p:nth-of-type(3), .region',
      imageSelector: '.product-image-main img'
    },
    'whisky-online.com': {
      titleSelector: '.h3.m-zero, h1',
      priceSelector: '.price-item, .price-item--last',
      brandSelector: '.metawrap p:nth-of-type(1)',
      regionSelector: '.metawrap p:nth-of-type(3), .region',
      imageSelector: '.img-product-details img'
    },
    'caskers.com': {
      titleSelector: '.product-title, .product-name, h1',
      priceSelector: '.product-price, .price',
      brandSelector: '.product-brand, .brand',
      regionSelector: '.product-region, .region',
      imageSelector: '.product-image img'
    },

    'baxus.co': {
      titleSelector: 'h1',
      priceSelector: '.xsm\\:numbers-medium',
    },
   
    'vivino.com': {
      titleSelector: '.wine-name, .wine-title, h1, .wineHeadline-module__wineHeadline--32Ety',
      priceSelector: '.price, .wine-price, .purchaseAvailabilityPPC__amount--2_4GT',
      brandSelector: '.winery-name, .producer, [data-testid="winery-name"]',
      regionSelector: '.wine-region, .region-name, [data-testid="wine-region"]',
      imageSelector: '.wine-image img, .bottle-image img'
    },
    
    
    // Add more retail sites as needed
  };
  
  // Throttle function to limit how often a function can be called
  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  // Function to extract bottle information from the current page
  function extractBottleInfo() {
    if (!window || !window.location || !window.location.hostname) return null;
    
    const hostname = window.location.hostname;
    
    // Find the matching site configuration
    const siteConfig = Object.entries(RETAIL_SITES).find(([domain]) => hostname.includes(domain));
    if (!siteConfig) return null;
    
    const [siteName, selectors] = siteConfig;
    console.log(`Honey Barrel: Detected site - ${siteName}`);
    
    // Try each selector until we find elements
    const titleElement = document.querySelector(selectors.titleSelector);
    const priceElement = document.querySelector(selectors.priceSelector);
    
    if (!titleElement || !priceElement) {
      console.log('Honey Barrel: Could not find required elements');
      return null;
    }
    
    // Extract basic information
    let bottleName = titleElement.textContent.trim();
    const priceText = priceElement.textContent.trim();
    
    // Try to parse the price, handling different formats
    const priceMatch = priceText.match(/[\d,.]+/);
    if (!priceMatch) return null;
    
    const priceString = priceMatch[0].replace(/,/g, '');
    const price = parseFloat(priceString);
    
    if (isNaN(price) || price <= 0) {
      console.log('Honey Barrel: Could not parse price');
      return null;
    }
    
    // Extract optional additional information
    const brandElement = document.querySelector(selectors.brandSelector);
    const regionElement = document.querySelector(selectors.regionSelector);
    const imageElement = document.querySelector(selectors.imageSelector);
    const vintageElement = selectors.vintageSelector ? document.querySelector(selectors.vintageSelector) : null;
    const varietalElement = selectors.varietalSelector ? document.querySelector(selectors.varietalSelector) : null;
    const ageElement = selectors.ageSelector ? document.querySelector(selectors.ageSelector) : null;
    const strengthElement = selectors.strengthSelector ? document.querySelector(selectors.strengthSelector) : null;
    
    // Extract vintage from bottle name or vintage element
    let vintage = null;
    if (vintageElement) {
      const vintageText = vintageElement.textContent.trim();
      const vintageMatch = vintageText.match(/\b(19|20)\d{2}\b/);
      if (vintageMatch) {
        vintage = vintageMatch[0];
      }
    }
    if (!vintage) {
      const vintageMatch = bottleName.match(/\b(19|20)\d{2}\b/);
      if (vintageMatch) {
        vintage = vintageMatch[0];
        // Remove vintage from bottle name to improve matching
        bottleName = bottleName.replace(vintageMatch[0], '').trim();
      }
    }
    
    const bottleInfo = {
      bottleName,
      price: Math.round(price * 100) / 100,
      siteName,
      url: window.location.href,
    };
    
    // Add optional information if available
    if (brandElement) {
      bottleInfo.brand = brandElement.textContent.trim();
    }
    
    if (regionElement) {
      bottleInfo.region = regionElement.textContent.trim();
    }
    
    if (imageElement && imageElement.src) {
      bottleInfo.imageUrl = imageElement.src;
    }
    
    if (vintage) {
      bottleInfo.vintage = vintage;
    }
    
    if (varietalElement) {
      bottleInfo.varietal = varietalElement.textContent.trim();
    }
    
    if (ageElement) {
      const ageText = ageElement.textContent.trim();
      const ageMatch = ageText.match(/\d+/);
      if (ageMatch) {
        bottleInfo.age = parseInt(ageMatch[0]);
      }
    }
    
    if (strengthElement) {
      const strengthText = strengthElement.textContent.trim();
      const strengthMatch = strengthText.match(/\d+(\.\d+)?/);
      if (strengthMatch) {
        bottleInfo.strength = parseFloat(strengthMatch[0]);
      }
    }
    
    // Normalize bottle name by removing common terms and special characters
    bottleInfo.normalizedName = normalizeBottleName(bottleName);
    
    console.log('Honey Barrel: Extracted bottle info', bottleInfo);
    return bottleInfo;
  }
  
  // Function to normalize bottle names for better matching
  function normalizeBottleName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\b(the|limited|edition|release|single|barrel|cask|strength|proof|year|old|aged|distillery|winery|vineyard|chateau|domaine)\b/g, '') // Remove common terms
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }
  
  // Check if an element is in the viewport
  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }
  
  // Enhanced overlay with transitions and rich information
  function createComparisonOverlay(matches, bottleInfo) {
    // Remove any existing overlay
    const existingOverlay = document.getElementById('honey-barrel-overlay');
    if (existingOverlay) existingOverlay.remove();
    
    // Create the overlay container
    const overlay = document.createElement('div');
    overlay.id = 'honey-barrel-overlay';
    overlay.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: white;
      border: none;
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      width: 320px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(10px);
      overflow: hidden;
    `;
    
    // Header section
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 15px 18px;
      background: #8b4513;
      color: white;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    `;
    
    header.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="font-size: 20px; margin-right: 8px;">🍷</span>
        <span>Honey Barrel</span>
      </div>
      <span style="cursor: pointer; font-size: 20px; line-height: 1;" 
        onclick="document.getElementById('honey-barrel-overlay').style.opacity = '0'; 
                 setTimeout(() => document.getElementById('honey-barrel-overlay').remove(), 300);">×</span>
    `;
    
    // Content section
    const content = document.createElement('div');
    content.style.cssText = `
      padding: 15px;
    `;
    
    if (matches.length > 0) {
      const bestMatch = matches[0];
      const priceDiff = bestMatch.price - bottleInfo.price;
      
      // Create price comparison
      const priceCompare = document.createElement('div');
      priceCompare.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-bottom: 15px;
        font-size: 14px;
      `;
      
      priceCompare.innerHTML = `
        <div style="flex: 1; background: #f9f6f2; padding: 10px; border-radius: 8px; margin-right: 8px;">
          <div style="color: #888; font-size: 12px;">Current Site</div>
          <div style="font-weight: bold; font-size: 16px;">$${bottleInfo.price.toFixed(2)}</div>
        </div>
        <div style="flex: 1; background: #f9f6f2; padding: 10px; border-radius: 8px;">
          <div style="color: #888; font-size: 12px;">BAXUS</div>
          <div style="font-weight: bold; font-size: 16px;">$${bestMatch.price.toFixed(2)}</div>
        </div>
      `;
      
      content.appendChild(priceCompare);
      
      // Savings or price comparison message
      const savingsDiv = document.createElement('div');
      savingsDiv.style.cssText = `
        padding: 10px;
        margin-bottom: 15px;
        border-radius: 8px;
        font-weight: 600;
        text-align: center;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      if (priceDiff < 0) {
        // Savings on BAXUS
        savingsDiv.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
        savingsDiv.style.color = '#157347';
        savingsDiv.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <polyline points="8 9 12 5 16 9"></polyline>
            <line x1="12" y1="5" x2="12" y2="19"></line>
          </svg>
          Save $${Math.abs(priceDiff).toFixed(2)} on BAXUS!
        `;
      } else if (priceDiff === 0) {
        // Same price
        savingsDiv.style.backgroundColor = 'rgba(108, 117, 125, 0.1)';
        savingsDiv.style.color = '#6c757d';
        savingsDiv.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Same price on both platforms
        `;
      } else {
        // Better price here
        savingsDiv.style.backgroundColor = 'rgba(255, 193, 7, 0.1)';
        savingsDiv.style.color = '#856404';
        savingsDiv.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <polyline points="8 15 12 19 16 15"></polyline>
            <line x1="12" y1="19" x2="12" y2="5"></line>
          </svg>
          Check this out !
        `;
      }
      
      content.appendChild(savingsDiv);
      
      // Match details with image if available
      if (bestMatch.imageUrl) {
        const matchDetails = document.createElement('div');
        matchDetails.style.cssText = `
          display: flex;
          background: #f9f6f2;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 15px;
          align-items: center;
        `;
        
        matchDetails.innerHTML = `
          <img src="${bestMatch.imageUrl}" alt="${bestMatch.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; margin-right: 12px;">
          <div>
            <div style="font-weight: 600; margin-bottom: 4px; color: #8b4513;">${bestMatch.name}</div>
            ${bestMatch.region ? `<div style="font-size: 12px; color: #777;">${bestMatch.region}</div>` : ''}
          </div>
        `;
        
        content.appendChild(matchDetails);
      }
      
      // View on BAXUS button
      const viewButton = document.createElement('a');
      viewButton.href = `https://baxus.co/asset/${bestMatch.id}`;
      viewButton.target = '_blank';
      viewButton.style.cssText = `
        display: block;
        background: #8b4513;
        color: white;
        text-decoration: none;
        padding: 12px;
        border-radius: 8px;
        text-align: center;
        font-weight: 500;
        transition: background 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      `;
      
      viewButton.innerHTML = `
        View on BAXUS
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 6px;">
          <path d="M5 12h14"></path>
          <path d="m12 5 7 7-7 7"></path>
        </svg>
      `;
      
      viewButton.addEventListener('mouseover', () => {
        viewButton.style.background = '#a0522d';
      });
      
      viewButton.addEventListener('mouseout', () => {
        viewButton.style.background = '#8b4513';
      });
      
      content.appendChild(viewButton);
      
    } else {
      // No matches found
      content.innerHTML = `
        <div style="text-align: center; padding: 20px 10px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="1.5" style="margin-bottom: 15px;">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 15h8"></path>
            <path d="M9 9h.01"></path>
            <path d="M15 9h.01"></path>
          </svg>
          <p style="color: #666;">No matching bottles found on BAXUS marketplace</p>
        </div>
      `;
    }
    
    // Add the elements to the overlay
    overlay.appendChild(header);
    overlay.appendChild(content);
    
    // Add footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 10px 15px;
      text-align: center;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #e0d6ca;
    `;
    footer.textContent = 'Powered by BAXUS marketplace';
    overlay.appendChild(footer);
    
    // Add to the page
    document.body.appendChild(overlay);
    
    // Trigger animation
    setTimeout(() => {
      overlay.style.opacity = '1';
      overlay.style.transform = 'translateY(0)';
    }, 10);
    
    // Add hover effect
    overlay.addEventListener('mouseenter', () => {
      overlay.style.transform = 'translateY(-2px)';
      overlay.style.boxShadow = '0 6px 25px rgba(0,0,0,0.2)';
    });
    
    overlay.addEventListener('mouseleave', () => {
      overlay.style.transform = 'translateY(0)';
      overlay.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    });
    
    return overlay;
  }
  
  // Add styles for toast notifications
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .honey-barrel-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        font-family: 'Segoe UI', sans-serif;
        font-size: 14px;
        z-index: 10000;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
        max-width: 300px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
      }
      
      .honey-barrel-toast.show {
        opacity: 1;
        transform: translateY(0);
      }
      
      .honey-barrel-toast-icon {
        margin-right: 10px;
        font-size: 20px;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Show a toast notification
  function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'honey-barrel-toast';
    toast.innerHTML = `
      <div class="honey-barrel-toast-icon">🍷</div>
      <div>${message}</div>
    `;
    
    document.body.appendChild(toast);
    
    // Show with animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Hide and remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, duration);
    
    return toast;
  }
  
  // Function to handle tab visibility changes
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // Re-check when tab becomes visible again
      const bottleInfo = extractBottleInfo();
      if (bottleInfo) {
        checkAndDisplayMatches(bottleInfo);
      }
    }
  }
  
// Function to handle bottle search and display results
async function checkAndDisplayMatches(bottleInfo) {
  try {
    if (!chrome?.runtime?.id) {
      console.log('Extension context invalidated');
      showToast("Honey Barrel: Extension needs to be reloaded. Please refresh the page.");
      return;
    }

    showToast("Honey Barrel: Searching for matches...");
    console.log('[Honey Barrel CS] Preparing to send SEARCH_BOTTLE message for:', bottleInfo.normalizedName); // Added log

    // Send a message to background.js to search for matches
    chrome.runtime.sendMessage({
      type: 'SEARCH_BOTTLE',
      bottleName: bottleInfo.normalizedName // Sending the normalized name
      // bottleName: bottleInfo.bottleName // Sending the normalized name

    }, (response) => {
      // --- Refined Response Handling ---
      if (chrome.runtime.lastError) {
        // Error during message sending/receiving itself (e.g., background script crashed)
        console.log('[Honey Barrel CS] Error communicating with background script:', chrome.runtime.lastError.message);
        showToast(`Honey Barrel Error: ${chrome.runtime.lastError.message}`);
        return;
      }

      console.log('[Honey Barrel CS] Received response from background:', response); // Log the response

      // Check if the background script reported an error in its response
      if (response && response.error) {
        console.log('[Honey Barrel CS] Background script reported an error:', response.error);
        showToast(`Honey Barrel Search Error: ${response.error}`);
      }
      // Check if matches were found
      else if (response && response.matches && response.matches.length > 0) {
        console.log(`[Honey Barrel CS] Found ${response.matches.length} matches. Creating overlay.`);
        createComparisonOverlay(response.matches, bottleInfo);
      }
      // Otherwise, no matches were found
      else {
         console.log('[Honey Barrel CS] No matches found or empty response.');
        showToast("Honey Barrel: No matches found on BAXUS marketplace."); // This is the line you highlighted (L591)
      }
      // --- End of Refined Response Handling ---
    });
  } catch (error) {
    console.log('[Honey Barrel CS] Error in checkAndDisplayMatches:', error); // Added prefix
    showToast("Honey Barrel: Error searching BAXUS marketplace. Please try again.");
  }
}
  
  // Initialize when page loads
  function initialize() {
    console.log("Honey Barrel content script initializing");
    
    // Add required styles
    addStyles();
    
    // Listen for visibility changes (when user returns to tab)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial check after a delay to allow page to fully load
    setTimeout(() => {
      const bottleInfo = extractBottleInfo();
      
      if (bottleInfo) {
        console.log("Bottle detected, searching for matches");
        showToast("Honey Barrel: Checking for better prices...");
        
        checkAndDisplayMatches(bottleInfo);
      } else {
        console.log("No bottle information detected on this page");
      }
    }, 1500);
    
    // Monitor for dynamic page changes (useful for SPAs)
    const observer = new MutationObserver(throttle(() => {
      const bottleInfo = extractBottleInfo();
      if (bottleInfo) {
        checkAndDisplayMatches(bottleInfo);
        observer.disconnect(); // Stop observing once we found a bottle
      }
    }, 2000));
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true
    });
    
    // Clean up observer after some time to avoid performance issues
    setTimeout(() => observer.disconnect(), 30000);
  }
  
  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);
    
    if (request.type === 'GET_BOTTLE_INFO') {
      const bottleInfo = extractBottleInfo();
      console.log("Extracted bottle info:", bottleInfo);
      sendResponse({ bottleInfo });
    } else if (request.type === 'SHOW_OVERLAY') {
      const bottleInfo = extractBottleInfo();
      if (bottleInfo && request.matches) {
        createComparisonOverlay(request.matches, bottleInfo);
      }
      sendResponse({ success: true });
    }
    
    return true; // Important to keep the message channel open
  });
  
  // Run initialization
  initialize();