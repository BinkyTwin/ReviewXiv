import fitz  # PyMuPDF
from typing import List, Dict, Any

def parse_pdf(file_path: str) -> Dict[str, Any]:
    """
    Parses a PDF file to extract its structure and content.
    Returns a dictionary representing the document structure.
    """
    doc = fitz.open(file_path)
    structure = {
        "title": doc.metadata.get("title", "Untitled Document"),
        "author": doc.metadata.get("author", "Unknown Author"),
        "page_count": len(doc),
        "sections": []
    }

    current_section = {"title": "Introduction", "content": ""}
    
    # Very basic parsing logic for MVP
    # Iterate through pages and accumulate text
    # In a real implementation, we would use font size/boldness to detect headers
    
    full_text = ""
    for page_num, page in enumerate(doc):
        text = page.get_text("text")
        full_text += text + "\n\n"
        
        # Simple heuristic: If we see a line that looks like a header (uppercase, short), start a new section
        # For MVP, let's just chunk by page or paragraphs if no headers found.
        # But let's try a slightly smarter block approach.
        
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text_span = span["text"].strip()
                        if not text_span:
                            continue
                            
                        # Improve header detection heuristic later
                        # For now, append everything to content
                        current_section["content"] += text_span + " "
                    current_section["content"] += "\n"

    # Add the single accumulated section for MVP simple view
    # Real segmentation will be improved in next iterations
    structure["sections"].append(current_section)
    
    return structure
