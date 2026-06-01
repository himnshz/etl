export interface ETLData {
  [key: string]: any;
}

export interface ETLLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface DataQualityReport {
  totalRows: number;
  duplicateCount: number;
  missingValues: { [key: string]: number };
  summaryStats: {
    [key: string]: {
      min: number;
      max: number;
      mean: number;
      median: number;
    };
  };
}

export interface ETLConfig {
  removeDuplicates: boolean;
  fillMissingValues: boolean;
  standardizeText: boolean;
  trimWhitespace: boolean;
  roundNumbers: boolean;
  calculateTotal: boolean; // price * quantity
  validateAge: boolean;
  validateSalary: boolean;
  validateEmails: boolean;
  removeEmptyRows: boolean;
}
