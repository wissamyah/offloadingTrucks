import { ParsedTruckEntry } from '../types/truck';

export function parseWhatsAppMessage(message: string): ParsedTruckEntry[] {
  const trucks: ParsedTruckEntry[] = [];
  const lines = message.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let currentIndex = 0;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex];

    // Check if this line matches a truck entry pattern (starts with number and dot or just a number)
    // Handle cases with spaces before the dot like "11 ."
    const truckMatch = line.match(/^(\d+)\s*\.?\s+(.+)/) || line.match(/^(\d+)\s+(.+)/);

    // Also check for format without number prefix but has bags pattern
    const bagsOnlyMatch = !truckMatch && currentIndex + 2 < lines.length &&
                          lines[currentIndex + 1].match(/^\d+\s*bags?\s*$/i);

    if (truckMatch || bagsOnlyMatch) {
      const fullLine = truckMatch ? truckMatch[2] : line;

      // Check if this is the old format (all info on one line)
      // Supports multiple patterns:
      // - "1. Supplier Name 234 bags 13%"
      // - "1. Jamilu jangale 400 bags *21%*" (with asterisks around moisture)
      // - "5. Murtala Yahaya 100 bags 21%" (without asterisks)
      // Truck number expected on next line (possibly indented)
      const oldFormatBagsMatch = fullLine.match(/(\d+)\s*bags?\s*/i);
      const oldFormatMoistureMatch = fullLine.match(/(\*?)(\d+(?:\.\d+)?)%(\*?)/);

      if (oldFormatBagsMatch && oldFormatMoistureMatch) {
        // OLD FORMAT: Everything on one line
        let moistureLevel = parseFloat(oldFormatMoistureMatch[2]);

        // Get everything before the moisture percentage
        const moistureIndex = fullLine.indexOf(oldFormatMoistureMatch[0]);
        const beforeMoisture = fullLine.substring(0, moistureIndex).trim();

        // Extract bags number
        const bags = parseInt(oldFormatBagsMatch[1], 10);

        // Get supplier name (everything before the bags number)
        // Use the bag number + " bag" pattern to find the index (more robust than using full match)
        const bagsIndex = beforeMoisture.indexOf(`${bags} bag`);
        const supplierName = beforeMoisture.substring(0, bagsIndex).trim();

        // Look for truck number on the next line
        let truckNumber = '';
        if (currentIndex + 1 < lines.length) {
          const nextLine = lines[currentIndex + 1];
          // Check if next line doesn't start with a number (not another truck entry)
          if (!nextLine.match(/^\d+\./)) {
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
      } else {
        // NEW FORMAT: Check if info is spread across multiple lines
        // First check for Format 3: Supplier (bags in parentheses) format
        const parenthesesBagsMatch = fullLine.match(/^(.+?)\s*\((\d+)\s*bags?\)/i);

        if (parenthesesBagsMatch && currentIndex + 2 < lines.length) {
          // Format 3:
          // 1. Supplier Name (150 bags)
          // Moisture - 26%
          // RRN 987 XA
          const supplierName = parenthesesBagsMatch[1].trim();
          const bags = parseInt(parenthesesBagsMatch[2], 10);

          const moistureLine = lines[currentIndex + 1];
          const truckLine = lines[currentIndex + 2];

          // Match moisture with optional dash before percentage
          const moistureMatch = moistureLine.match(/moisture\s*[-:]?\s*(\d+(?:\.\d+)?)%?/i);

          if (moistureMatch) {
            const moistureLevel = parseFloat(moistureMatch[1]);
            const truckNumber = truckLine.trim();

            if (supplierName && bags > 0) {
              trucks.push({
                supplierName,
                bags,
                moistureLevel,
                truckNumber,
              });
            }

            // Skip the lines we've processed
            currentIndex += 2;
            continue; // Skip to next iteration to avoid double processing
          }
        }
        // Format 4: Supplier name with bags (no parentheses) on first line
        else if (currentIndex + 2 < lines.length) {
          const bagsWithoutParensMatch = fullLine.match(/^(.+?)\s+(\d+)\s+bags?\s*$/i);

          if (bagsWithoutParensMatch) {
            // Format 4:
            // 1. Addau isyaku 110 bags
            // Moisture 22%
            // ABC 784 XB
            const supplierName = bagsWithoutParensMatch[1].trim();
            const bags = parseInt(bagsWithoutParensMatch[2], 10);

            const moistureLine = lines[currentIndex + 1];
            const truckLine = lines[currentIndex + 2];

            // Match moisture with or without dash/colon
            const moistureMatch = moistureLine.match(/moisture\s*[-:]?\s*(\d+(?:\.\d+)?)%?/i);

            if (moistureMatch) {
              const moistureLevel = parseFloat(moistureMatch[1]);
              const truckNumber = truckLine.trim();

              if (supplierName && bags > 0) {
                trucks.push({
                  supplierName,
                  bags,
                  moistureLevel,
                  truckNumber,
                });
              }

              // Skip the lines we've processed
              currentIndex += 2;
              continue; // Skip to next iteration
            }
          }
        }

        // The supplier name is just the text after the number (or the whole line if no number)
        const supplierName = fullLine.trim();

          // Handle special case where entry doesn't start with number but has bags on next line
          if (bagsOnlyMatch && currentIndex + 3 < lines.length) {
            const bagsLine = lines[currentIndex + 1];
            const moistureLine = lines[currentIndex + 2];
            const truckLine = lines[currentIndex + 3];

            const bagsMatch = bagsLine.match(/^(\d+)\s*bags?\s*$/i);
            const moistureMatch = moistureLine.match(/moisture\s*(\d+(?:\.\d+)?)%?/i);

            if (bagsMatch && moistureMatch) {
              const bags = parseInt(bagsMatch[1], 10);
              const moistureLevel = parseFloat(moistureMatch[1]);
              const truckNumber = truckLine.trim();

              if (supplierName && bags > 0) {
                trucks.push({
                  supplierName,
                  bags,
                  moistureLevel,
                  truckNumber,
                });
              }

              // Skip the lines we've processed
              currentIndex += 3;
            }
          }
          // Check if we have enough lines ahead for the new formats
          else if (currentIndex + 3 < lines.length) {
            const line2 = lines[currentIndex + 1];
            const line3 = lines[currentIndex + 2];
            const line4 = lines[currentIndex + 3];

            // Format 1 (Original multi-line):
            // 1. Supplier Name
            // 305 Bags
            // FTA 256 XB
            // Moisture 23.5
            const format1BagsMatch = line2.match(/^(\d+)\s*bags?\s*$/i);
            const format1MoistureMatch = line4.match(/moisture\s*(\d+(?:\.\d+)?)/i);

            // Format 2 (New format from user):
            // 1. Supplier Name
            // 220 bags
            // Moisture 22.5%
            // DDM 250 XA
            const format2BagsMatch = line2.match(/^(\d+)\s*bags?\s*$/i);
            const format2MoistureMatch = line3.match(/moisture\s*(\d+(?:\.\d+)?)%?/i);

            if (format1BagsMatch && format1MoistureMatch) {
              // This is Format 1 (original multi-line)
              const bags = parseInt(format1BagsMatch[1], 10);
              const moistureLevel = parseFloat(format1MoistureMatch[1]);
              const truckNumber = line3.trim();

              if (supplierName && bags > 0) {
                trucks.push({
                  supplierName,
                  bags,
                  moistureLevel,
                  truckNumber,
                });
              }

              // Skip the lines we've processed
              currentIndex += 3;
            } else if (format2BagsMatch && format2MoistureMatch) {
              // This is Format 2 (new format with moisture on line 3, truck on line 4)
              const bags = parseInt(format2BagsMatch[1], 10);
              const moistureLevel = parseFloat(format2MoistureMatch[1]);
              const truckNumber = line4.trim();

              if (supplierName && bags > 0) {
                trucks.push({
                  supplierName,
                  bags,
                  moistureLevel,
                  truckNumber,
                });
              }

              // Skip the lines we've processed
              currentIndex += 3;
            } else if (supplierName) {
              // This might be old format with just supplier name on the line
              // Try to find bags and moisture info in the supplier name itself
              const bagsInNameMatch = supplierName.match(/(\d+)\s*bags?\s*/i);
              const moistureInNameMatch = supplierName.match(/(\*?)(\d+(?:\.\d+)?)%(\*?)/);

              if (bagsInNameMatch) {
                const bags = parseInt(bagsInNameMatch[1], 10);
                const moistureLevel = moistureInNameMatch ? parseFloat(moistureInNameMatch[2]) : 0;

                // Extract actual supplier name
                const bagsIndex = supplierName.indexOf(bagsInNameMatch[0]);
                const cleanSupplierName = supplierName.substring(0, bagsIndex).trim();

                // Look for truck number on the next line
                let truckNumber = '';
                if (currentIndex + 1 < lines.length) {
                  const nextLine = lines[currentIndex + 1];
                  if (!nextLine.match(/^\d+\./)) {
                    truckNumber = nextLine.trim();
                    currentIndex++;
                  }
                }

                if (cleanSupplierName && bags > 0) {
                  trucks.push({
                    supplierName: cleanSupplierName,
                    bags,
                    moistureLevel,
                    truckNumber,
                  });
                }
              }
            }
          }
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