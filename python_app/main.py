from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import io
import pandas as pd
from etl_service import ETLService
import json

app = FastAPI(title="AutoETL API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/process")
async def process_data(file: UploadFile = File(...), config: str = Form(...)):
    try:
        # Read the file content
        content = await file.read()
        try:
            content_str = content.decode('utf-8')
        except UnicodeDecodeError:
            content_str = content.decode('ISO-8859-1')
            
        file_obj = io.StringIO(content_str)
        
        etl = ETLService()
        df = etl.extract(file_obj)
        
        config_dict = json.loads(config)
        transformed_df = etl.transform(df, config_dict)
        report = etl.generate_report(transformed_df)
        csv_str = etl.load(transformed_df)
        
        # Replace NaNs with None for JSON serialization
        preview_df = transformed_df.head(5)
        # Convert columns to string or safe types if needed, then to dict
        preview_df = preview_df.where(pd.notnull(preview_df), None)
        
        return JSONResponse(content={
            "report": report,
            "logs": etl.get_logs(),
            "csv_content": csv_str,
            "preview": preview_df.to_dict(orient="records")
            # JSONResponse automatically handles basic structures, but pandas DataFrames with NaN can fail.
            # Using where(notnull, None) fixes NaN to None translation.
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
