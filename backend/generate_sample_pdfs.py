import os
import fitz # PyMuPDF

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_reports")
os.makedirs(SAMPLE_DIR, exist_ok=True)

REPORTS_DATA = [
    {
        "filename": "Sample_Blood_Report_1_Anemia.pdf",
        "title": "METROPOLITAN DIAGNOSTIC LABORATORY - BLOOD PANEL",
        "patient": "Patient Name: Jane Doe | Age: 34 | Gender: Female | Date: 2026-01-15",
        "results": [
            "Test Name           Observed Value   Unit     Reference Range   Status",
            "----------------------------------------------------------------------",
            "Hemoglobin          10.2             g/dL     13.0 - 17.0       LOW",
            "Fasting Glucose     95.0             mg/dL    70.0 - 99.0        NORMAL",
            "Vitamin D           18.0             ng/mL    30.0 - 100.0      LOW",
            "Total Cholesterol   210.0            mg/dL    125.0 - 200.0     HIGH",
            "White Blood Cell    6.5              x10^3/uL 4.5 - 11.0        NORMAL",
            "Platelets           250.0            x10^3/uL 150.0 - 450.0     NORMAL"
        ]
    },
    {
        "filename": "Sample_Blood_Report_2_FollowUp.pdf",
        "title": "METROPOLITAN DIAGNOSTIC LABORATORY - FOLLOW-UP PANEL",
        "patient": "Patient Name: Jane Doe | Age: 34 | Gender: Female | Date: 2026-04-20",
        "results": [
            "Test Name           Observed Value   Unit     Reference Range   Status",
            "----------------------------------------------------------------------",
            "Hemoglobin          12.1             g/dL     13.0 - 17.0       LOW",
            "Fasting Glucose     98.0             mg/dL    70.0 - 99.0        NORMAL",
            "Vitamin D           25.0             ng/mL    30.0 - 100.0      LOW",
            "Total Cholesterol   190.0            mg/dL    125.0 - 200.0     NORMAL",
            "White Blood Cell    6.8              x10^3/uL 4.5 - 11.0        NORMAL",
            "Platelets           260.0            x10^3/uL 150.0 - 450.0     NORMAL"
        ]
    },
    {
        "filename": "Sample_Blood_Report_3_FullPanel.pdf",
        "title": "METROPOLITAN DIAGNOSTIC LABORATORY - COMPREHENSIVE PANEL",
        "patient": "Patient Name: Jane Doe | Age: 34 | Gender: Female | Date: 2026-08-10",
        "results": [
            "Test Name           Observed Value   Unit     Reference Range   Status",
            "----------------------------------------------------------------------",
            "Hemoglobin          14.5             g/dL     13.0 - 17.0       NORMAL",
            "Fasting Glucose     115.0            mg/dL    70.0 - 99.0        HIGH",
            "TSH                 5.8              mIU/L    0.4 - 4.0         HIGH",
            "White Blood Cell    12.5             x10^3/uL 4.5 - 11.0        HIGH",
            "Platelets           280.0            x10^3/uL 150.0 - 450.0     NORMAL",
            "Vitamin D           35.0             ng/mL    30.0 - 100.0      NORMAL"
        ]
    }
]

def generate_pdfs():
    for rep in REPORTS_DATA:
        doc = fitz.open()
        page = doc.new_page(width=595, height=842) # A4 size
        
        # Draw header box
        rect = fitz.Rect(30, 30, 565, 80)
        page.draw_rect(rect, color=(0.06, 0.46, 0.43), fill=(0.94, 0.98, 0.98), width=1.5)
        
        page.insert_text((45, 52), rep["title"], fontsize=13, fontname="Helvetica-Bold", color=(0.06, 0.46, 0.43))
        page.insert_text((45, 70), rep["patient"], fontsize=10, fontname="Helvetica", color=(0.2, 0.2, 0.2))
        
        # Draw lab table
        y = 120
        for line in rep["results"]:
            font = "Helvetica-Bold" if "Test Name" in line or "---" in line else "Courier"
            page.insert_text((45, y), line, fontsize=10, fontname=font, color=(0.1, 0.1, 0.1))
            y += 22

        # Draw footer note
        page.insert_text((45, 780), "Notice: Diagnostic values verified under standard reference methodologies.", fontsize=8, color=(0.5, 0.5, 0.5))

        pdf_path = os.path.join(SAMPLE_DIR, rep["filename"])
        doc.save(pdf_path)
        doc.close()
        print(f"Generated PDF: {pdf_path}")

if __name__ == "__main__":
    generate_pdfs()
