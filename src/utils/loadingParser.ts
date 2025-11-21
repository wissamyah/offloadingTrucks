import { ParsedLoadingEntry } from '../types/loading';

/**
 * Parse WhatsApp messages for loadings with flexible format support
 * Handles:
 * - Customer name (first line)
 * - Multiple product lines (1-N lines)
 * - Truck details in any order (plate, driver, phone)
 * - Flexible kg/kgs variations
 */
export function parseLoadingMessage(message: string): ParsedLoadingEntry[] {
  const loadings: ParsedLoadingEntry[] = [];
  const lines = message
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return loadings;
  }

  let currentIndex = 0;

  // Process entries (separated by blank lines or customer patterns)
  while (currentIndex < lines.length) {
    const entry = parseLoadingEntry(lines, currentIndex);
    
    if (entry.loading) {
      loadings.push(entry.loading);
    }
    
    currentIndex = entry.nextIndex;
  }

  return loadings;
}

interface ParseResult {
  loading: ParsedLoadingEntry | null;
  nextIndex: number;
}

function parseLoadingEntry(lines: string[], startIndex: number): ParseResult {
  if (startIndex >= lines.length) {
    return { loading: null, nextIndex: startIndex + 1 };
  }

  // Extract customer name (first line)
  const customerName = lines[startIndex].trim();
  if (!customerName) {
    return { loading: null, nextIndex: startIndex + 1 };
  }

  let currentIndex = startIndex + 1;
  const productLines: string[] = [];
  const truckDetailsLines: string[] = [];

  // Pattern for product lines: NUMBER + text + kg/kgs variations
  // Handles: "200 Kwik rice 50kg", "350 Oga rice 50 kgs", "100 Sorted Broken 25 KG"
  const productPattern = /^\d+\s+.+?\s+\d+\s*kgs?\b/i;

  // Read product lines
  while (currentIndex < lines.length) {
    const line = lines[currentIndex];
    
    if (productPattern.test(line)) {
      productLines.push(line);
      currentIndex++;
    } else {
      // Not a product line, must be truck details
      break;
    }
  }

  // If no products found, this might not be a valid entry
  if (productLines.length === 0) {
    // Try to skip to next potential entry
    return { loading: null, nextIndex: startIndex + 1 };
  }

  // Read ALL remaining lines as truck details
  // Since each entry is typically pasted separately, collect everything after products
  while (currentIndex < lines.length) {
    const line = lines[currentIndex];
    truckDetailsLines.push(line);
    currentIndex++;
  }

  // Parse truck details using pattern matching (order independent)
  const truckDetails = extractTruckDetails(truckDetailsLines);

  // Validation: must have customer name, products, and truck plate
  if (!customerName || productLines.length === 0 || !truckDetails.truckNumber) {
    return { loading: null, nextIndex: currentIndex };
  }

  const loading: ParsedLoadingEntry = {
    customerName: customerName,
    products: productLines.join('\n'),
    truckNumber: truckDetails.truckNumber,
    driverName: truckDetails.driverName,
    driverPhone: truckDetails.driverPhone,
  };

  return { loading, nextIndex: currentIndex };
}

interface TruckDetails {
  truckNumber: string;
  driverName?: string;
  driverPhone?: string;
}

function extractTruckDetails(lines: string[]): TruckDetails {
  let truckNumber = '';
  let driverPhone: string | undefined = undefined;
  const driverNameParts: string[] = [];

  // Patterns for truck details
  // Plate: XXX NNN XX or XXX NN XX (e.g., "TTD 09 YL", "MGR 459 XA", "JJN 830 XC")
  const platePattern = /\b([A-Z]{3}\s*\d{2,3}\s*[A-Z]{2})\b/i;
  
  // Phone: 10-11 digits with optional formatting (very flexible for spaces)
  // Matches patterns like: 08012345678, 0801 234 5678, 08012 345 678, etc.
  const phonePattern = /\b(0\d[\d\s]{9,12}|\d{11})\b/;
  
  // Prefixes to remove for clean extraction (MUST have colon to be treated as a label)
  const truckPrefixPattern = /^(truck\s*no\.?\s*:\s*|truck\s*:\s*)/i;
  const driverPrefixPattern = /^(drive\s*name\s*:\s*|driver\s*name\s*:\s*|driver\s*:\s*)/i;
  const phonePrefixPattern = /^(phone\s*no\.?\s*:\s*|phone\s*:\s*|tel\s*:\s*)/i;

  // Helper function to check if a line contains a valid phone number
  const isValidPhone = (line: string): boolean => {
    const match = line.match(phonePattern);
    if (!match) return false;
    const cleaned = match[1].replace(/\s+/g, '');
    return cleaned.length === 11 && /^\d+$/.test(cleaned);
  };

  // First pass: extract plate and phone (these have clear patterns)
  for (let line of lines) {
    if (!line || line.trim() === '') continue;
    
    const cleanLine = line.trim();
    
    // Check for plate number
    const plateMatch = cleanLine.match(platePattern);
    if (plateMatch && !truckNumber) {
      truckNumber = plateMatch[1].replace(/\s+/g, ' ').trim();
      continue;
    }
    
    // Check for phone number
    const phoneMatch = cleanLine.match(phonePattern);
    if (phoneMatch && !driverPhone) {
      // Remove all spaces from phone number
      const cleanPhone = phoneMatch[1].replace(/\s+/g, '');
      // Verify it's exactly 11 digits after cleaning
      if (cleanPhone.length === 11 && /^\d+$/.test(cleanPhone)) {
        driverPhone = cleanPhone;
        continue;
      }
    }
  }

  // Second pass: collect driver name parts (anything that's not plate or phone)
  for (let line of lines) {
    if (!line || line.trim() === '') continue;
    
    const cleanLine = line.trim();
    
    // Skip if this line contains plate or valid phone
    if (platePattern.test(cleanLine) || isValidPhone(cleanLine)) {
      continue;
    }
    
    // Remove common prefixes (only if they have colons or "name" keyword)
    let namePart = cleanLine
      .replace(truckPrefixPattern, '')
      .replace(driverPrefixPattern, '')
      .replace(phonePrefixPattern, '')
      .trim();
    
    // If there's meaningful text left, this is the driver name (handles multi-word names)
    if (namePart && namePart.length > 1) {
      driverNameParts.push(namePart);
    }
  }

  // Combine driver name parts with space
  const driverName = driverNameParts.length > 0 
    ? driverNameParts.join(' ') 
    : undefined;

  return { truckNumber, driverName, driverPhone };
}

export function validateParsedLoadings(entries: ParsedLoadingEntry[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  entries.forEach((entry, index) => {
    if (!entry.customerName || entry.customerName.trim() === '') {
      errors.push(`Entry ${index + 1}: Missing customer name`);
    }

    if (!entry.products || entry.products.trim() === '') {
      errors.push(`Entry ${index + 1}: Missing products`);
    }

    if (!entry.truckNumber || entry.truckNumber.trim() === '') {
      errors.push(`Entry ${index + 1}: Missing truck number`);
    }

    // Driver name and phone are optional, no validation needed
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

