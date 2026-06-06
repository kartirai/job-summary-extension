// content.js - Fixed company name and recruiter extraction
console.log("Job Summary Extractor: Content script loaded");

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received:", request);
  
  if (request.action === "getJobDetails") {
    try {
      const pageText = document.body.innerText;
      console.log("Page text length:", pageText.length);
      
      const details = {
        company: extractCompany(pageText),
        team: extractTeam(pageText),
        experience: extractExperience(pageText),
        location: extractLocation(pageText),
        mode: extractMode(pageText),
        salary: extractSalary(pageText),
        recruiter: extractRecruiter(pageText)
      };
      
      console.log("Extracted details:", details);
      sendResponse({ success: true, data: details });
    } catch (error) {
      console.error("Extraction error:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

function extractCompany(text) {
  // First priority: Look for company in header elements
  const companySelectors = [
    '.jobs-unified-top-card__company-name',
    '.jobsearch-JobInfoHeader-company',
    '[data-testid="job-details-company"]',
    '.job-company',
    '[class*="company-name"]',
    '[class*="employer"]'
  ];
  
  for (let selector of companySelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const company = element.innerText.trim();
      if (company && company.length > 2 && company.length < 100) {
        // Filter out common false positives
        const invalidCompanies = ['you', 'your', 'we', 'our', 'this', 'that', 'the', 'a', 'an'];
        if (!invalidCompanies.includes(company.toLowerCase())) {
          console.log("Found company via selector:", company);
          return company;
        }
      }
    }
  }
  
  // Improved patterns - removed the problematic 'at' pattern
  const patterns = [
    /Company:\s*([A-Z][A-Za-z\s&]+?)(?:\n|$)/i,
    /Employer:\s*([A-Z][A-Za-z\s&]+?)(?:\n|$)/i,
    /(?:About|Join)\s+([A-Z][A-Za-z\s&]+?)(?:\s+is\s+hiring|\s+is\s+seeking|\n)/i,
    /at\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*(?:\s+[&]?\s*[A-Z][A-Za-z]+)?)(?:\s+[-|(]|\n|$)/i
  ];
  
  for (let pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let company = match[1].trim();
      // Filter out common false positives
      const invalidMatches = ['you', 'your', 'we', 'our', 'this', 'that', 'the', 'a', 'an', 'and', 'or', 'but'];
      const companyLower = company.toLowerCase();
      
      let isValid = true;
      for (let invalid of invalidMatches) {
        if (companyLower === invalid || companyLower.startsWith(invalid + ' ') || companyLower.endsWith(' ' + invalid)) {
          isValid = false;
          break;
        }
      }
      
      // Also ensure company has at least one capital letter or is long enough
      if (isValid && (company.match(/[A-Z]/) || company.length > 5)) {
        console.log("Found company via pattern:", company);
        return company;
      }
    }
  }
  
  return null;
}

function extractTeam(text) {
  const patterns = [
    /Team:\s*([^\n]{3,50})/i,
    /Department:\s*([^\n]{3,50})/i,
    /Join the\s+([^\n]{3,50}?team)/i,
    /part of the\s+([^\n]{3,50}?(?:team|department))/i,
    /You'll be part of the\s+([^\n]{3,50}?(?:team|department))/i
  ];
  
  for (let pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let team = match[1].trim();
      // Filter out false positives
      if (team.length > 3 && team.length < 100 && !team.match(/^you|your|we|our|this|that$/i)) {
        return team;
      }
    }
  }
  return null;
}

function extractExperience(text) {
  const patterns = [
    /(\d+)\+?\s*years?\s*(?:of)?\s*experience/i,
    /(\d+)\s*\+\s*years?/i,
    /Experience:\s*(\d+[+-]?\s*years?)/i,
    /(\d+)\+?\s*years?\s+prior/i,
    /minimum\s*(\d+)\+?\s*years?/i,
    /at least\s*(\d+)\+?\s*years?/i,
    /(\d+)[+-]?\s*yrs?\s+exp/i,
    /(\d+)\+?\s*years?\s+of\s+relevant\s+experience/i
  ];
  
  for (let pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

function extractLocation(text) {
  // First check header area for location
  const locationSelectors = [
    '.jobs-unified-top-card__bullet',
    '.jobsearch-JobInfoHeader-subtitle',
    '[data-testid="job-location"]',
    '[class*="location"]'
  ];
  
  for (let selector of locationSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      let loc = element.innerText.trim();
      if (loc && loc.length < 100 && loc.match(/[A-Za-z]/)) {
        // Remove job type text
        loc = loc.replace(/full-time|part-time|contract|temporary/gi, '').trim();
        if (loc && !loc.match(/^you|your|we|our$/i)) {
          return loc;
        }
      }
    }
  }
  
  // Then check text patterns
  const patterns = [
    /Location:\s*([^,\n]+(?:,\s*[^,\n]+)?)/i,
    /Based in\s+([^,\n]+(?:,\s*[^,\n]+)?)/i,
    /Job Location:\s*([^\n]+)/i
  ];
  
  for (let pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let location = match[1].trim();
      if (location.length < 100 && !location.match(/^you|your|we|our|this|that$/i)) {
        return location;
      }
    }
  }
  
  // Check for remote
  if (text.match(/remote/i) && !text.match(/hybrid/i)) return "Remote";
  
  return null;
}

function extractMode(text) {
  const lower = text.toLowerCase();
  if (lower.includes('hybrid')) return 'Hybrid';
  if (lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh')) return 'Remote';
  if (lower.includes('on-site') || lower.includes('on site') || lower.includes('in office')) return 'On-site';
  return null;
}

function extractSalary(text) {
  const patterns = [
    /\$[\d,]+(?:\.\d{2})?\s*-\s*\$[\d,]+(?:\.\d{2})?/,
    /\$[\d,]+(?:k|K)?(?:\s*-\s*\$[\d,]+(?:k|K)?)?/,
    /£[\d,]+(?:k)?\s*-\s*£[\d,]+(?:k)?/,
    /€[\d,]+(?:k)?\s*-\s*€[\d,]+(?:k)?/,
    /₹[\d,]+(?:k)?\s*-\s*₹[\d,]+(?:k)?/,
    /(?:salary|pay|compensation):\s*([^.\n]{5,40})/i
  ];
  
  for (let pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return null;
}

function extractRecruiter(text) {
  console.log("Searching for recruiter info...");
  
  // Look for email
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = text.match(emailPattern);
  
  // Improved name patterns - require explicit context
  const namePatterns = [
    /Contact(?:\s+person)?:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+at\s+|\s+via\s+|\n|$)/i,
    /Reach out to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+at\s+|\s+via\s+|\n|$)/i,
    /Recruiter(?:\s+name)?:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\n|$)/i,
    /Hiring Manager(?:\s+name)?:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\n|$)/i,
    /Please contact\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+at\s+|\s+via\s+|\n|$)/i,
    /Send your resume to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+at\s+|\n|$)/i,
    /For questions?\s+contact\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s+at\s+|\n|$)/i,
    /Talent Acquisition(?:\s+contact)?:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /HR contact:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  ];
  
  let name = null;
  for (let pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      name = match[1].trim();
      // Validate name looks real (at least one capital, 2-30 chars)
      if (name.match(/[A-Z]/) && name.length > 2 && name.length < 30) {
        console.log("Found recruiter name:", name);
        break;
      } else {
        name = null;
      }
    }
  }
  
  // Look for phone with context
  const phonePattern = /(?:phone|call|tel|contact|reach)\D*?(\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i;
  const phoneMatch = text.match(phonePattern);
  const phone = phoneMatch ? phoneMatch[1] : null;
  if (phone) console.log("Found phone number:", phone);
  
  const parts = [];
  if (name) parts.push(`Name: ${name}`);
  if (emailMatch) parts.push(`Email: ${emailMatch[0]}`);
  if (phone) parts.push(`Phone: ${phone}`);
  
  const result = parts.length ? parts.join(' | ') : null;
  
  if (result) {
    console.log("Recruiter contact found:", result);
  } else {
    console.log("No recruiter contact found");
  }
  
  return result;
}