import streamlit as st
import pandas as pd
import time
from etl_service import ETLService

st.set_page_config(page_title="AutoETL", page_icon="🔄", layout="wide")

# Custom CSS for UI styling
st.markdown("""
<style>
    @keyframes slideUpFade {
        from { opacity: 0; transform: translateY(40px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(50px); }
        to { opacity: 1; transform: translateX(0); }
    }
    /* Animate main columns */
    div[data-testid="column"]:nth-child(1) {
        animation: slideUpFade 0.5s ease-out forwards;
    }
    div[data-testid="column"]:nth-child(2) {
        animation: slideInRight 0.6s ease-out forwards;
    }
    /* App background */
    .stApp {
        background-color: #f8fafc;
    }
    /* Animated metric cards */
    .metric-card {
        background-color: white;
        padding: 1.5rem;
        border-radius: 1rem;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        border: 1px solid #e2e8f0;
        text-align: left;
        animation: slideUpFade 0.6s ease-out forwards;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .metric-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04);
    }
    .metric-title {
        color: #64748b;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }
    .metric-value {
        color: #0f172a;
        font-size: 1.875rem;
        font-weight: 700;
    }
    .log-line {
        animation: slideInRight 0.3s ease-out forwards;
    }
</style>
""", unsafe_allow_html=True)

# Initialize Session State
if 'etl' not in st.session_state:
    st.session_state.etl = ETLService()
if 'data' not in st.session_state:
    st.session_state.data = None
if 'processed_data' not in st.session_state:
    st.session_state.processed_data = None
if 'report' not in st.session_state:
    st.session_state.report = None
if 'file_name' not in st.session_state:
    st.session_state.file_name = None
if 'csv_output' not in st.session_state:
    st.session_state.csv_output = None

etl = st.session_state.etl

# Header
col_h1, col_h2 = st.columns([10, 1])
with col_h1:
    st.title("🔄 AutoETL")
with col_h2:
    if st.button("Trash 🗑️"):
        st.session_state.etl.clear_logs()
        st.session_state.data = None
        st.session_state.processed_data = None
        st.session_state.report = None
        st.session_state.file_name = None
        st.session_state.csv_output = None
        st.rerun()

st.divider()

col1, col2 = st.columns([4, 8], gap="large")

with col1:
    st.subheader("1. Extract")
    uploaded_file = st.file_uploader("Upload CSV", type=['csv'])
    if uploaded_file is not None and st.session_state.file_name != uploaded_file.name:
        st.session_state.file_name = uploaded_file.name
        etl.clear_logs()
        df = etl.extract(uploaded_file)
        st.session_state.data = df
        st.session_state.processed_data = None
        st.session_state.report = None
        st.session_state.csv_output = None
    
    st.write("---")
    st.subheader("2. Transform Rules")
    
    config = {
        'removeDuplicates': st.checkbox("Remove Duplicates", value=True),
        'removeEmptyRows': st.checkbox("Remove Empty Rows", value=True),
        'trimWhitespace': st.checkbox("Trim Whitespace", value=True),
        'standardizeText': st.checkbox("Standardize Text", value=True),
        'roundNumbers': st.checkbox("Round Numbers", value=True),
        'fillMissingValues': st.checkbox("Fill Missing Values", value=True),
        'calculateTotal': st.checkbox("Calculate Total", value=True),
        'validateAge': st.checkbox("Validate Age", value=True),
        'validateSalary': st.checkbox("Validate Salary", value=True),
        'validateEmails': st.checkbox("Validate Emails", value=True),
    }
    
    run_disabled = st.session_state.data is None
    if st.button("▶️ Run Pipeline", disabled=run_disabled, use_container_width=True, type="primary"):
        with st.spinner("Processing..."):
            time.sleep(1) # simulate delay
            transformed = etl.transform(st.session_state.data, config)
            st.session_state.processed_data = transformed
            
            report = etl.generate_report(transformed)
            st.session_state.report = report
            
            csv_str = etl.load(transformed)
            st.session_state.csv_output = csv_str
            st.rerun()
            
    st.write("---")
    st.subheader("3. Load")
    download_disabled = st.session_state.csv_output is None
    if not download_disabled:
        st.download_button(
            label="⬇️ Download Cleaned CSV",
            data=st.session_state.csv_output,
            file_name=f"cleaned_{st.session_state.file_name}",
            mime="text/csv",
            use_container_width=True
        )
    else:
        st.button("⬇️ Download Cleaned CSV", disabled=True, use_container_width=True)

with col2:
    report = st.session_state.report
    
    if report is None:
        st.info("Upload a CSV and run the pipeline to see the data quality report.")
    else:
        # Metrics
        m1, m2, m3 = st.columns(3)
        total_missing = sum(report['missingValues'].values())
        
        with m1:
            st.markdown(f'<div class="metric-card"><div class="metric-title">Total Rows</div><div class="metric-value">{report["totalRows"]}</div></div>', unsafe_allow_html=True)
        with m2:
            st.markdown(f'<div class="metric-card"><div class="metric-title">Missing Values</div><div class="metric-value" style="color:#d97706;">{total_missing}</div></div>', unsafe_allow_html=True)
        with m3:
            st.markdown(f'<div class="metric-card"><div class="metric-title">Columns</div><div class="metric-value" style="color:#4f46e5;">{len(report["missingValues"])}</div></div>', unsafe_allow_html=True)
            
        st.write("")
        
        # Charts and Stats
        c1, c2 = st.columns(2)
        with c1:
            st.subheader("Missing Values by Column")
            missing_df = pd.DataFrame(list(report['missingValues'].items()), columns=['name', 'value'])
            if not missing_df.empty:
                st.bar_chart(data=missing_df, x='name', y='value', color="#6366f1", height=300)
            else:
                st.write("No missing values info available.")
                
        with c2:
            st.subheader("Summary Statistics")
            if len(report['summaryStats']) > 0:
                for key, stats in report['summaryStats'].items():
                    with st.expander(f"{key.upper()}", expanded=True):
                        st.write(f"**Mean:** {stats['mean']:.2f} | **Median:** {stats['median']:.2f}")
                        st.write(f"**Min:** {stats['min']} | **Max:** {stats['max']}")
            else:
                st.write("No numeric columns found for statistics.")
                
    st.write("---")
            
    # Logs Section
    st.subheader("Terminal Logs")
    log_container = st.container(height=300)
    for log in etl.get_logs():
        color = "white"
        if log['level'] == 'success': color = "green"
        if log['level'] == 'warning': color = "orange"
        if log['level'] == 'error': color = "red"
        if log['level'] == 'info': color = "lightblue"
        log_container.markdown(f"<div class='log-line'><span style='color:grey'>[{log['timestamp']}]</span> <strong style='color:{color}'>{log['level'].upper()}:</strong> {log['message']}</div>", unsafe_allow_html=True)
        
    if report is not None and st.session_state.processed_data is not None:
        st.write("---")
        st.subheader("Cleaned Data Preview (First 5 rows)")
        st.dataframe(st.session_state.processed_data.head(5), use_container_width=True)
