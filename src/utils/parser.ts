import { ParsedTruckEntry } from '../types/truck';

export function parseWhatsAppMessage(message: string): ParsedTruckEntry[] {
  const trucks: ParsedTruckEntry[] = [];
  const lines = message.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let currentIndex = 0;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex];

    // Check if this line matches a truck entry pattern (starts with number and dot)
    const truckMatch = line.match(/^(\d+)\.\s*(.+)/);

    if (truckMatch) {
      // Parse the truck entry line
      // Pattern: "1. Supplier Name 234 bags 13%"
      const fullLine = truckMatch[2];

      // Extract moisture percentage (with or without asterisks for bold)
      const moistureMatch = fullLine.match(/(\*?)(\d+(?:\.\d+)?)%(\*?)/);
      let moistureLevel = 0;
      let beforeMoisture = fullLine;

      if (moistureMatch) {
        moistureLevel = parseFloat(moistureMatch[2]);
        // Get everything before the moisture percentage
        const moistureIndex = fullLine.indexOf(moistureMatch[0]);
        beforeMoisture = fullLine.substring(0, moistureIndex).trim();
      }

      // Extract bags number (last number before moisture)
      const bagsMatch = beforeMoisture.match(/(\d+)\s*bags?\s*$/i);
      let bags = 0;
      let supplierName = beforeMoisture;

      if (bagsMatch) {
        bags = parseInt(bagsMatch[1], 10);
        // Get supplier name (everything before the bags number)
        const bagsIndex = beforeMoisture.lastIndexOf(bagsMatch[0]);
        supplierName = beforeMoisture.substring(0, bagsIndex).trim();
      }

      // Look for truck number on the next line
      let truckNumber = '';
      if (currentIndex + 1 < lines.length) {
        const nextLine = lines[currentIndex + 1];
        // Check if next line doesn't start with a number (not another truck entry)
        if (!nextLine.match(/^\d+\./)) {
          // This should be the truck number line
          // Remove any leading/trailing spaces but keep internal spaces
          truckNumber = nextLine.trim();
          currentIndex++; // Skip this line in the next iteration
        }
      }

      if (supplierName && bags > 0) {
        trucks.push({
          supplierName,
          bags,
          moistureLevel,
          truckNumber,
        });
      }
    }

    currentIndex++;
  }

  return trucks;
}

export function validateParsedData(entries: ParsedTruckEntry[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  entries.forEach((entry, index) => {
    if (!entry.supplierName || entry.supplierName.trim() === '') {
      errors.push(`Entry ${index + 1}: Missing supplier name`);
    }

    if (entry.bags <= 0) {
      errors.push(`Entry ${index + 1}: Invalid number of bags`);
    }

    if (entry.moistureLevel < 0 || entry.moistureLevel > 100) {
      errors.push(`Entry ${index + 1}: Invalid moisture level`);
    }

    if (!entry.truckNumber || entry.truckNumber.trim() === '') {
      errors.push(`Entry ${index + 1}: Missing truck number`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}