import Papa from 'papaparse';
import { ETLData, DataQualityReport, ETLConfig, ETLLog } from '../types';

export class ETLService {
  private logs: ETLLog[] = [];

  private addLog(message: string, level: ETLLog['level'] = 'info') {
    this.logs.push({
      timestamp: new Date().toLocaleTimeString(),
      message,
      level,
    });
  }

  public getLogs(): ETLLog[] {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
  }

  public async extract(file: File): Promise<ETLData[]> {
    this.addLog(`Extracting data from ${file.name}...`);
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          this.addLog(`Extraction complete. Found ${results.data.length} rows.`, 'success');
          resolve(results.data as ETLData[]);
        },
        error: (error) => {
          this.addLog(`Extraction failed: ${error.message}`, 'error');
          reject(error);
        },
      });
    });
  }

  public transform(data: ETLData[], config: ETLConfig): ETLData[] {
    this.addLog('Starting transformation process...');
    let processedData = [...data];

    // 1. Remove Duplicates
    if (config.removeDuplicates) {
      const initialCount = processedData.length;
      processedData = Array.from(new Set(processedData.map(item => JSON.stringify(item)))).map(item => JSON.parse(item));
      const removedCount = initialCount - processedData.length;
      if (removedCount > 0) {
        this.addLog(`Removed ${removedCount} duplicate rows.`, 'warning');
      }
    }

    // 2. Remove Empty Rows
    if (config.removeEmptyRows) {
      const initialCount = processedData.length;
      processedData = processedData.filter(row => {
        return Object.values(row).some(val => val !== null && val !== undefined && val !== '');
      });
      const removedCount = initialCount - processedData.length;
      if (removedCount > 0) {
        this.addLog(`Removed ${removedCount} completely empty rows.`, 'warning');
      }
    }

    // 3. Data Cleaning & Formatting
    processedData = processedData.map((row) => {
      const newRow = { ...row };
      
      for (const key in newRow) {
        // Trim Whitespace
        if (config.trimWhitespace && typeof newRow[key] === 'string') {
          newRow[key] = newRow[key].trim();
        }

        // Standardize text (lowercase)
        if (config.standardizeText && typeof newRow[key] === 'string') {
          newRow[key] = newRow[key].toLowerCase();
        }

        // Round Numbers
        if (config.roundNumbers && typeof newRow[key] === 'number') {
          newRow[key] = Math.round(newRow[key] * 100) / 100;
        }

        // Fill missing values
        if (config.fillMissingValues && (newRow[key] === null || newRow[key] === undefined || newRow[key] === '')) {
          if (typeof newRow[key] === 'number') newRow[key] = 0;
          else newRow[key] = 'N/A';
        }
      }

      // 4. Apply Calculations (Total = Price * Quantity)
      if (config.calculateTotal && 'price' in newRow && 'quantity' in newRow) {
        const price = Number(newRow.price) || 0;
        const quantity = Number(newRow.quantity) || 0;
        let total = price * quantity;
        if (config.roundNumbers) total = Math.round(total * 100) / 100;
        newRow.total = total;
      }

      return newRow;
    });

    // 5. Data Validation
    if (config.validateAge) {
      const initialCount = processedData.length;
      processedData = processedData.filter(row => !('age' in row) || (typeof row.age === 'number' && row.age > 0));
      const removedCount = initialCount - processedData.length;
      if (removedCount > 0) {
        this.addLog(`Removed ${removedCount} rows with invalid age.`, 'warning');
      }
    }

    if (config.validateSalary) {
      const initialCount = processedData.length;
      processedData = processedData.filter(row => !('salary' in row) || (typeof row.salary === 'number' && row.salary >= 0));
      const removedCount = initialCount - processedData.length;
      if (removedCount > 0) {
        this.addLog(`Removed ${removedCount} rows with invalid salary.`, 'warning');
      }
    }

    if (config.validateEmails) {
      const initialCount = processedData.length;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      processedData = processedData.filter(row => {
        const emailKey = Object.keys(row).find(k => k.toLowerCase().includes('email'));
        if (emailKey && typeof row[emailKey] === 'string' && row[emailKey] !== 'N/A') {
          return emailRegex.test(row[emailKey]);
        }
        return true;
      });
      const removedCount = initialCount - processedData.length;
      if (removedCount > 0) {
        this.addLog(`Removed ${removedCount} rows with invalid email formats.`, 'warning');
      }
    }

    this.addLog('Transformation complete.', 'success');
    return processedData;
  }

  public generateReport(data: ETLData[]): DataQualityReport {
    const report: DataQualityReport = {
      totalRows: data.length,
      duplicateCount: 0, // Already handled in transform
      missingValues: {},
      summaryStats: {},
    };

    if (data.length === 0) return report;

    const keys = Object.keys(data[0]);
    keys.forEach(key => {
      let missing = 0;
      const values: number[] = [];

      data.forEach(row => {
        if (row[key] === null || row[key] === undefined || row[key] === '' || row[key] === 'N/A') {
          missing++;
        }
        if (typeof row[key] === 'number') {
          values.push(row[key]);
        }
      });

      report.missingValues[key] = missing;

      if (values.length > 0) {
        values.sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const median = values[Math.floor(values.length / 2)];

        report.summaryStats[key] = {
          min: values[0],
          max: values[values.length - 1],
          mean,
          median,
        };
      }
    });

    return report;
  }

  public load(data: ETLData[]): string {
    this.addLog('Generating output CSV...');
    const csv = Papa.unparse(data);
    this.addLog('Output ready for download.', 'success');
    return csv;
  }
}
