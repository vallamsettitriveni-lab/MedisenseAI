import urllib.request
import urllib.error
import json
import os

def test_live_upload():
    # 1. Login
    login_data = json.dumps({'email': 'test_patient_live@medisense.com', 'password': 'PatientPass123!'}).encode('utf-8')
    req = urllib.request.Request(
        'https://medisenseai-backend-kz82.onrender.com/api/v1/auth/login',
        data=login_data,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    res = urllib.request.urlopen(req)
    token = json.loads(res.read().decode())['access_token']
    print("Logged in successfully. Token acquired.")

    # 2. Upload Michael Brown PDF
    pdf_path = os.path.abspath('../sample_reports/Lab_Report_003_Michael_Brown_20240205.pdf')
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()

    boundary = '----WebKitFormBoundaryX9A1B2C3D4E5'
    body = bytearray()
    body.extend(f'--{boundary}\r\n'.encode('utf-8'))
    body.extend(b'Content-Disposition: form-data; name="file"; filename="Lab_Report_003_Michael_Brown_20240205.pdf"\r\n')
    body.extend(b'Content-Type: application/pdf\r\n\r\n')
    body.extend(pdf_bytes)
    body.extend(f'\r\n--{boundary}--\r\n'.encode('utf-8'))

    upload_req = urllib.request.Request(
        'https://medisenseai-backend-kz82.onrender.com/api/v1/reports/upload',
        data=bytes(body),
        headers={
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'Authorization': f'Bearer {token}'
        },
        method='POST'
    )

    try:
        up_res = urllib.request.urlopen(upload_req)
        report_data = json.loads(up_res.read().decode())
        print(f"Status Code: {up_res.getcode()}")
        print(f"File Name: {report_data.get('file_name')}")
        print(f"Processing Status: {report_data.get('processing_status')}")
        lab_results = report_data.get('lab_results', [])
        print(f"Lab Results Count: {len(lab_results)}")
        for lab in lab_results:
            print(f"  * {lab.get('test_name')}: {lab.get('value')} {lab.get('unit')} ({lab.get('status')})")
    except urllib.error.HTTPError as e:
        print(f"HTTP ERROR: {e.code}")
        print(e.read().decode())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    test_live_upload()
