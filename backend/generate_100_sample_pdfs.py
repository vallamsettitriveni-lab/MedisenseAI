import os
import random
import datetime
import uuid
import fitz # PyMuPDF

SAMPLE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_reports")
os.makedirs(SAMPLE_DIR, exist_ok=True)

LAB_NAMES = [
    "METROPOLITAN DIAGNOSTIC LABORATORY",
    "CITY HEALTH CLINICAL LABS",
    "APEX PATHOLOGY CENTER",
    "QUEST REGIONAL DIAGNOSTICS",
    "BETHESDA MEDICAL PATHOLOGY"
]

PATIENT_NAMES = [
    ("Jane Doe", "Female", 34),
    ("John Smith", "Male", 42),
    ("Alice Johnson", "Female", 29),
    ("Michael Brown", "Male", 55),
    ("Emily Davis", "Female", 38),
    ("David Wilson", "Male", 48)
]

TEST_SPECS = [
    ("Hemoglobin", "g/dL", 13.0, 17.0, 8.5, 18.5),
    ("Fasting Glucose", "mg/dL", 70.0, 99.0, 60.0, 160.0),
    ("Vitamin D", "ng/mL", 30.0, 100.0, 10.0, 110.0),
    ("Total Cholesterol", "mg/dL", 125.0, 200.0, 110.0, 280.0),
    ("TSH", "mIU/L", 0.4, 4.0, 0.1, 8.5),
    ("White Blood Cell", "x10^3/uL", 4.5, 11.0, 3.0, 16.0),
    ("Platelets", "x10^3/uL", 150.0, 450.0, 120.0, 520.0)
]

def generate_105_pdfs():
    start_date = datetime.date(2024, 1, 15)
    generated_count = 0

    for i in range(1, 106):
        patient_name, gender, age = PATIENT_NAMES[i % len(PATIENT_NAMES)]
        lab_name = LAB_NAMES[i % len(LAB_NAMES)]
        report_date = start_date + datetime.timedelta(days=i * 7)

        doc = fitz.open()
        page = doc.new_page(width=595, height=842)

        # Draw Header
        rect = fitz.Rect(30, 30, 565, 80)
        page.draw_rect(rect, color=(0.06, 0.46, 0.43), fill=(0.94, 0.98, 0.98), width=1.5)

        page.insert_text((45, 52), f"{lab_name} - REPORT #{1000 + i}", fontsize=12, fontname="Helvetica-Bold", color=(0.06, 0.46, 0.43))
        page.insert_text((45, 70), f"Patient: {patient_name} | Age: {age} | Gender: {gender} | Date: {report_date.strftime('%Y-%m-%d')}", fontsize=9, color=(0.2, 0.2, 0.2))

        # Select 4 to 6 random tests for this report
        selected_tests = random.sample(TEST_SPECS, random.randint(4, 6))

        page.insert_text((45, 110), f"{'Test Name':<22} {'Observed Value':<16} {'Unit':<10} {'Reference Range':<16} {'Status'}", fontsize=9, fontname="Helvetica-Bold", color=(0.1, 0.1, 0.1))
        page.insert_text((45, 120), "-" * 75, fontsize=9, fontname="Helvetica", color=(0.5, 0.5, 0.5))

        y = 138
        for test_name, unit, ref_min, ref_max, val_low, val_high in selected_tests:
            val = round(random.uniform(val_low, val_high), 1)
            
            status = "NORMAL"
            if val < ref_min:
                status = "LOW"
            elif val > ref_max:
                status = "HIGH"

            line_str = f"{test_name:<22} {val:<16} {unit:<10} {ref_min} - {ref_max:<10} {status}"
            page.insert_text((45, y), line_str, fontsize=9, fontname="Courier", color=(0.1, 0.1, 0.1))
            y += 20

        page.insert_text((45, 780), f"Official Lab Certificate #{uuid.uuid4().hex[:8]} | Diagnostic Range Verified", fontsize=8, color=(0.5, 0.5, 0.5))

        filename = f"Lab_Report_{i:03d}_{patient_name.replace(' ', '_')}_{report_date.strftime('%Y%m%d')}.pdf"
        filepath = os.path.join(SAMPLE_DIR, filename)

        doc.save(filepath)
        doc.close()
        generated_count += 1

    print(f"Successfully generated {generated_count} sample lab report PDFs in '{SAMPLE_DIR}'!")

if __name__ == "__main__":
    generate_105_pdfs()
