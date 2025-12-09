import fitz  # PyMuPDF
import os
from typing import Dict, Any, List

def parse_pdf(file_path: str, image_output_dir: str, image_url_prefix: str) -> Dict[str, Any]:
    """
    Parses a PDF file to extract structure, metadata, and images.
    Returns a dictionary representing the document structure.
    """
    doc = fitz.open(file_path)
    file_id = os.path.splitext(os.path.basename(file_path))[0]
    
    # Heuristic for Metadata
    title = doc.metadata.get("title")
    author = doc.metadata.get("author")
    
    # If metadata is empty, try to find the largest text on page 1
    if not title or title == "Untitled Document":
        page1 = doc[0]
        blocks = page1.get_text("dict")["blocks"]
        max_size = 0
        best_text = ""
        for b in blocks:
            if "lines" in b:
                for l in b["lines"]:
                    for s in l["spans"]:
                        if s["size"] > max_size:
                            max_size = s["size"]
                            best_text = s["text"]
                        elif s["size"] == max_size:
                            best_text += " " + s["text"]
        if max_size > 15: # Threshold for title
            title = best_text.strip()
            
    structure = {
        "title": title or "Untitled Document",
        "author": author or "Unknown Author",
        "page_count": len(doc),
        "sections": []
    }

    current_section = {"title": "Introduction", "content": []} # Content is now a list of blocks
    
    sections_found = ["Introduction"]

    for page_index, page in enumerate(doc):
        # 1. Extract and Save Images
        image_list = page.get_images(full=True)
        page_images = {} # xref -> url
        
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image["ext"]
            
            image_filename = f"{file_id}_p{page_index}_i{img_index}.{image_ext}"
            image_path = os.path.join(image_output_dir, image_filename)
            
            with open(image_path, "wb") as f:
                f.write(image_bytes)
                
            page_images[xref] = f"{image_url_prefix}/{image_filename}"

        # 2. Extract Text Blocks and merge with images positionally
        # This is complex in PyMuPDF. Simplification:
        # We append images at the end of the page or try to insert them if we had position data.
        # For this MVP v2, let's just use the `get_text("dict")` which contains image blocks too if using recent MuPDF? 
        # Actually `get_text("dict")` returns headers for content.
        
        blocks = page.get_text("dict")["blocks"]
        # Blocks are typically sorted top-left to bottom-right
        
        for b in blocks:
            if b["type"] == 1: # Image block
                 # It seems MuPDF doesn't always give image blocks in "dict" mode easily unless we interpret them.
                 # Let's fallback to the image list extraction we did above.
                 pass
                 
        # Re-iterating blocks for text
        for b in blocks:
            if b["type"] == 0: # Text
                block_text = ""
                for l in b["lines"]:
                    for s in l["spans"]:
                        block_text += s["text"] + " "
                    block_text += "\n"
                
                text_clean = block_text.strip()
                if not text_clean: 
                    continue

                # Header Detection Heuristic
                # If text is short, uppercase or bold (we'd need font flags), and matches typical section names
                is_header = False
                upper_text = text_clean.upper()
                common_headers = ["ABSTRACT", "INTRODUCTION", "METHODOLOGY", "METHODS", "RESULTS", "DISCUSSION", "CONCLUSION", "REFERENCES"]
                
                # Check for direct match or numbered match "1. INTRODUCTION"
                if len(text_clean) < 50:
                    for h in common_headers:
                        if h in upper_text:
                            is_header = True
                            clean_title = text_clean
                            break
                
                if is_header:
                    # Save old section
                    structure["sections"].append(current_section)
                    # Start new
                    current_section = {"title": clean_title, "content": []}
                    sections_found.append(clean_title)
                else:
                    current_section["content"].append({"type": "text", "value": text_clean})

        # Append images found on this page to the current section (Naive placement)
        # Ideally we would obtain the rect of the text block and the image to interleave them.
        # For now, append at the end of the page's text processing.
        for url in page_images.values():
             current_section["content"].append({"type": "image", "src": url})

    # Add the last section
    if current_section["content"] or current_section["link"]:
        structure["sections"].append(current_section)
    
    # Cleanup empty sections
    structure["sections"] = [s for s in structure["sections"] if s["content"]]
    
    return structure
