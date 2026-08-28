import io
import fitz  # PyMuPDF
from PIL import Image

try:
    import pytesseract
except ImportError:
    pytesseract = None

class PDFParser:
    @staticmethod
    def extract_text_from_pdf(pdf_bytes: bytes) -> str:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        extracted_text_chunks = []

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text").strip()

            # If text length is sufficient, use direct PyMuPDF text
            if len(text) > 50 or pytesseract is None:
                extracted_text_chunks.append(text)
            else:
                # Page appears scanned: render to image and run OCR if pytesseract installed
                try:
                    pix = page.get_pixmap(dpi=300)
                    img = Image.open(io.BytesIO(pix.tobytes()))
                    ocr_text = pytesseract.image_to_string(img)
                    extracted_text_chunks.append(ocr_text)
                except Exception as e:
                    print(f"OCR processing fallback warning for page {page_num}: {e}")
                    extracted_text_chunks.append(text)

        doc.close()
        return "\n\n".join(extracted_text_chunks)
