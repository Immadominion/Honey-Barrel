// Background script for Honey Barrel extension
const BAXUS_API_URL = 'https://services.baxus.co/api/search/listings';
// Change PAGE_SIZE to 2000 to match the desired first fetch
const PAGE_SIZE = 2000;
// Try lowering the threshold for testing:
// const SIMILARITY_THRESHOLD = 0.6;
const SIMILARITY_THRESHOLD = 0.4; // Lowered for testing

// --- Ensure these helper functions are present ---
// Function to normalize bottle names for better matching
// --- Ensure this function is the complete version (including common word removal) ---
function normalizeBottleName(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\b(the|limited|edition|release|single|barrel|cask|strength|proof|year|old|aged|distillery|winery|vineyard|chateau|domaine)\b/g, '') // Remove common terms
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

// Function to calculate similarity between two strings (Levenshtein distance based)
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength > 0 ? 1 - track[str2.length][str1.length] / maxLength : (str1 === str2 ? 1 : 0);
}
// --- End of helper functions ---


async function searchBaxusListings(query, maxPages = 2000) { // 'query' is now the raw name
  try {
    console.log(`[Honey Barrel BG] Received raw query: "${query}"`);
    // --- Normalize the incoming query HERE ---
    const normalizedQuery = normalizeBottleName(query);
    console.log(`[Honey Barrel BG] Normalized query to: "${normalizedQuery}"`);
    // ---

    if (!normalizedQuery) {
        console.log("[Honey Barrel BG] Empty normalized query after normalization, skipping search.");
        return [];
    }

    let allResults = [];
    let currentPage = 0;
    let hasMoreResults = true;

    // The loop structure remains the same.
    // With PAGE_SIZE = 2000, the first iteration (currentPage=0)
    // will fetch from=0, size=2000.
    // Subsequent iterations will fetch from=2000, size=2000, etc.
    while (hasMoreResults && currentPage < maxPages) {
      const from = currentPage * PAGE_SIZE; // Now calculates 0, 2000, 4000...
      console.log(`[Honey Barrel BG] Fetching page ${currentPage + 1} (from: ${from}, size: ${PAGE_SIZE})`); // Log size

      try {
        // Log the exact URL being fetched
        const apiUrl = `${BAXUS_API_URL}?from=${from}&size=${PAGE_SIZE}&listed=true`;
        console.log(`[Honey Barrel BG] Fetching from URL: ${apiUrl}`);
        
        const response = await fetch(
          apiUrl,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          }
        );

        if (!response.ok) {
          // Log error but continue trying other pages if possible (though unlikely to succeed)
          console.log(`[Honey Barrel BG] API request failed for page ${currentPage + 1}: ${response.status}`);
           // Decide if you want to break or continue based on status code
           if (response.status === 404 || response.status === 400) { // Example: Stop on bad request/not found
                break;
           }
           // Continue for server errors, maybe temporary
        } else {
            // Get the response as text first to log it
            const responseText = await response.text();
            console.log(`[Honey Barrel BG] Raw API response for page ${currentPage + 1}:`, responseText);
            
            // Then parse it as JSON
            const data = JSON.parse(responseText);
            
            // Check the structure of the data
            console.log(`[Honey Barrel BG] Data structure:`, Object.keys(data));
            
            // Determine if data is an array or has a hits property
            let resultsArray = [];
            if (Array.isArray(data)) {
                // If data is already an array, use it directly
                resultsArray = data;
                console.log(`[Honey Barrel BG] Data is an array with ${resultsArray.length} items`);
          
            } else {
                // If we can't find an array structure, log the issue and use an empty array
                console.log(`[Honey Barrel BG] Unexpected data structure:`, data);
                resultsArray = [];
            }
            
            // After fetching resultsArray
            console.log(`[Honey Barrel BG] Received ${resultsArray.length} results for page ${currentPage + 1}`);
            
            // Log the first few results to see what we're working with
            if (resultsArray.length > 0) {
                console.log(`[Honey Barrel BG] First result sample:`, JSON.stringify(resultsArray[0], null, 2));
                
                resultsArray.forEach(item => {
                  console.log(`[Honey Barrel BG] API Result Name: "${item._source?.name}"`);
                });
            const pageMatches = resultsArray
                .map(item => {
                  // Calculate similarity for each item before filtering
                  const itemName = item._source?.name;
                  const itemAttributes = item._source?.attributes || {};
                  // --- Normalize API results using the SAME function ---
                  const normalizedItemName = normalizeBottleName(itemName);

                  const searchFieldsData = [
                    { field: 'name', value: itemName, normalized: normalizedItemName },
                    { field: 'Producer', value: itemAttributes.Producer, normalized: normalizeBottleName(itemAttributes.Producer) },
                    { field: 'Type', value: itemAttributes.Type, normalized: normalizeBottleName(itemAttributes.Type) },
                    { field: 'Region', value: itemAttributes.Region, normalized: normalizeBottleName(itemAttributes.Region) },
                    { field: 'Country', value: itemAttributes.Country, normalized: normalizeBottleName(itemAttributes.Country) }
                  ].filter(f => f.normalized);
                  // ---

                  let maxSimilarity = 0;
                  let bestMatchField = null;

                  // ... inside the .map(item => { ... }) function ...
                  searchFieldsData.forEach(fieldData => {
                    const similarity = calculateSimilarity(normalizedQuery, fieldData.normalized);
                    // Added this log to see all similarity scores
                    console.log(`[Honey Barrel BG] Comparing "${normalizedQuery}" with "${fieldData.normalized}" (Field: ${fieldData.field}) -> Similarity: ${similarity.toFixed(3)}`);
                    if (similarity > maxSimilarity) {
                        maxSimilarity = similarity;
                        bestMatchField = fieldData.field;
                    }
                  });

                  // Add similarity score to the item for potential filtering/sorting
                  return { ...item, calculatedSimilarity: maxSimilarity, bestMatchField: bestMatchField };
                })
                .filter(item => {
                  // Filter based on the calculated max similarity
                  const passes = item.calculatedSimilarity >= SIMILARITY_THRESHOLD;
                  if (passes) {
                      console.log(`[Honey Barrel BG] Match Found: Name: "${item._source?.name}", Query: "${normalizedQuery}", Similarity: ${item.calculatedSimilarity.toFixed(3)} (Field: ${item.bestMatchField})`);
                  }
                  return passes;
                })
                .map(item => ({ // Map to the final structure needed by the popup/overlay
                  id: item._source.id,
                  name: item._source.name,
                  price: item._source.price,
                  imageUrl: item._source.imageUrl,
                  spiritType: item._source.spiritType,
                  blurhash: item._source.blurhash,
                  region: item._source.attributes?.Region,
                  country: item._source.attributes?.Country,
                  producer: item._source.attributes?.Producer,
                  // Use the pre-calculated max similarity for sorting
                  similarity: item.calculatedSimilarity
                }));

              console.log(`[Honey Barrel BG] Found ${pageMatches.length} matches on page ${currentPage + 1} above threshold ${SIMILARITY_THRESHOLD}`);
              allResults = [...allResults, ...pageMatches];
            }

            // This logic correctly stops when a page returns 0 results
            hasMoreResults = resultsArray.length > 0;
        }


      } catch (fetchError) {
        console.log(`[Honey Barrel BG] Fetch error on page ${currentPage + 1}:`, fetchError);
        // Decide if you want to break the loop on fetch error
        break; // Stop fetching further pages if one fails
      }
      currentPage++;
    }

    console.log(`[Honey Barrel BG] Total results before sorting: ${allResults.length}`);
    // Sort results by the calculated similarity score
    allResults.sort((a, b) => b.similarity - a.similarity);
    console.log(`[Honey Barrel BG] Found ${allResults.length} total matches after filtering and sorting.`);

    return allResults;
  } catch (error) {
    console.log('[Honey Barrel BG] General error in searchBaxusListings:', error);
    return [];
  }
}

// Message handling with proper async support
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SEARCH_BOTTLE') {
    // Ensure bottleName is provided
    if (!request.bottleName) {
        console.log("[Honey Barrel BG] Received SEARCH_BOTTLE request with no bottleName.");
        sendResponse({ matches: [], query: null, error: "No bottle name provided" });
        return false; // Indicate synchronous response or no response needed
    }

    searchBaxusListings(request.bottleName, 2000) // Using maxPages = 3
      .then(matches => {
        console.log(`[Honey Barrel BG] Sending back ${matches.length} matches for query "${request.bottleName}"`);
        sendResponse({ matches, query: request.bottleName });
      })
      .catch(error => {
        console.log('[Honey Barrel BG] Error during searchBaxusListings call:', error);
        sendResponse({ matches: [], error: error.message, query: request.bottleName });
      });

    return true; // Keep message channel open for async response
  }
  // Handle other message types if necessary
  return false; // Indicate synchronous response or no response needed for other types
});

// Keep service worker active
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Honey Barrel BG] Extension installed/updated');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[Honey Barrel BG] Browser started');
});