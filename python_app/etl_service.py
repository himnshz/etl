import pandas as pd
import numpy as np
import re
from typing import Dict, Any, List

class ETLService:
    def __init__(self):
        self.logs: List[Dict[str, Any]] = []

    def get_logs(self) -> List[Dict[str, Any]]:
        return self.logs

    def clear_logs(self):
        self.logs = []

    def add_log(self, message: str, level: str = 'info'):
        import datetime
        timestamp = datetime.datetime.now().strftime('%I:%M:%S %p')
        self.logs.append({
            'timestamp': timestamp,
            'message': message,
            'level': level
        })

    def extract(self, file_content) -> pd.DataFrame:
        self.add_log(f'Extracting data...', 'info')
        try:
            df = pd.read_csv(file_content, skip_blank_lines=True)
            self.add_log(f'Extraction complete. Found {len(df)} rows.', 'success')
            return df
        except Exception as e:
            self.add_log(f'Extraction failed: {str(e)}', 'error')
            raise e

    def transform(self, df: pd.DataFrame, config: Dict[str, bool]) -> pd.DataFrame:
        self.add_log('Starting transformation process...', 'info')
        # We work on a copy to avoid SettingWithCopyWarning
        processed_df = df.copy()

        # 1. Remove Duplicates
        if config.get('removeDuplicates', False):
            initial_count = len(processed_df)
            processed_df.drop_duplicates(inplace=True)
            removed_count = initial_count - len(processed_df)
            if removed_count > 0:
                self.add_log(f'Removed {removed_count} duplicate rows.', 'warning')

        # 2. Remove Empty Rows
        if config.get('removeEmptyRows', False):
            initial_count = len(processed_df)
            processed_df.dropna(how='all', inplace=True)
            removed_count = initial_count - len(processed_df)
            if removed_count > 0:
                self.add_log(f'Removed {removed_count} completely empty rows.', 'warning')

        # 3. Data Cleaning & Formatting
        # Trim Whitespace and Standardize text
        for col in processed_df.columns:
            if pd.api.types.is_object_dtype(processed_df[col]) or pd.api.types.is_string_dtype(processed_df[col]):
                if config.get('trimWhitespace', False):
                    processed_df[col] = processed_df[col].astype(str).str.strip()
                if config.get('standardizeText', False):
                    processed_df[col] = processed_df[col].astype(str).str.lower()
                
                # Undo stringification of nan created by .astype(str) if any
                processed_df[col].replace('nan', np.nan, inplace=True)
                val_mask = processed_df[col] == ''
                processed_df.loc[val_mask, col] = np.nan

        # Replace "" with NaN to uniformize missing values
        processed_df.replace('', np.nan, inplace=True)

        # Round Numbers
        if config.get('roundNumbers', False):
            for col in processed_df.columns:
                if pd.api.types.is_numeric_dtype(processed_df[col]):
                    processed_df[col] = processed_df[col].round(2)

        # Fill missing values
        if config.get('fillMissingValues', False):
            for col in processed_df.columns:
                if pd.api.types.is_numeric_dtype(processed_df[col]):
                    processed_df[col].fillna(0, inplace=True)
                else:
                    processed_df[col].fillna('N/A', inplace=True)

        # 4. Apply Calculations
        if config.get('calculateTotal', False):
            if 'price' in processed_df.columns and 'quantity' in processed_df.columns:
                price_col = pd.to_numeric(processed_df['price'], errors='coerce').fillna(0)
                quantity_col = pd.to_numeric(processed_df['quantity'], errors='coerce').fillna(0)
                total = price_col * quantity_col
                if config.get('roundNumbers', False):
                    total = total.round(2)
                processed_df['total'] = total

        # 5. Data Validation (Filter rows out)
        if config.get('validateAge', False) and 'age' in processed_df.columns:
            initial_count = len(processed_df)
            age_numeric = pd.to_numeric(processed_df['age'], errors='coerce')
            valid_mask = (age_numeric > 0) | processed_df['age'].isna() | (processed_df['age'] == 'N/A')
            processed_df = processed_df[valid_mask]
            removed_count = initial_count - len(processed_df)
            if removed_count > 0:
                self.add_log(f'Removed {removed_count} rows with invalid age.', 'warning')

        if config.get('validateSalary', False) and 'salary' in processed_df.columns:
            initial_count = len(processed_df)
            salary_numeric = pd.to_numeric(processed_df['salary'], errors='coerce')
            valid_mask = (salary_numeric >= 0) | processed_df['salary'].isna() | (processed_df['salary'] == 'N/A')
            processed_df = processed_df[valid_mask]
            removed_count = initial_count - len(processed_df)
            if removed_count > 0:
                self.add_log(f'Removed {removed_count} rows with invalid salary.', 'warning')

        if config.get('validateEmails', False):
            initial_count = len(processed_df)
            email_cols = [c for c in processed_df.columns if 'email' in c.lower()]
            if email_cols:
                email_col = email_cols[0]
                regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
                mask = processed_df[email_col].astype(str).str.match(regex) | (processed_df[email_col].isna()) | (processed_df[email_col] == 'N/A')
                processed_df = processed_df[mask]
                removed_count = initial_count - len(processed_df)
                if removed_count > 0:
                    self.add_log(f'Removed {removed_count} rows with invalid email formats.', 'warning')

        self.add_log('Transformation complete.', 'success')
        return processed_df

    def generate_report(self, df: pd.DataFrame) -> Dict[str, Any]:
        report = {
            'totalRows': len(df),
            'duplicateCount': 0,
            'missingValues': {},
            'summaryStats': {}
        }
        
        if len(df) == 0:
            return report

        # Missing values handling
        # Consider 'N/A' as missing value for the chart to match ts logic closely where it counted nulls or N/A
        for col in df.columns:
            missing_count = int(df[col].isna().sum() + (df[col] == 'N/A').sum())
            report['missingValues'][col] = missing_count

            if pd.api.types.is_numeric_dtype(df[col]):
                # compute summary stats, ignoring NaNs and N/A equivalent since numeric type handles NaNs natively
                valid_data = df[col].dropna()
                if len(valid_data) > 0:
                    report['summaryStats'][col] = {
                        'min': float(valid_data.min()),
                        'max': float(valid_data.max()),
                        'mean': float(valid_data.mean()),
                        'median': float(valid_data.median())
                    }

        return report

    def load(self, df: pd.DataFrame) -> str:
        self.add_log('Generating output CSV...', 'info')
        csv = df.to_csv(index=False)
        self.add_log('Output ready for download.', 'success')
        return csv
