import os
import torch
import numpy as np
from PIL import Image
from config import IMAGE_DIR, DEVICE, BATCH_SIZE
from transformers import CLIPProcessor, CLIPModel

def generate_embeddings(model, processor, keyword=None, captions_dict=None, use_captions=False, uploaded_image_path=None):
    """
    Generate image embeddings for database images (optionally with captions or uploaded image comparison).
    Args:
        model: CLIPModel
        processor: CLIPProcessor
        keyword: Search keyword (optional)
        captions_dict: Dictionary mapping image paths to captions
        use_captions: Whether to use captions for text embeddings
        uploaded_image_path: Path to uploaded image for similarity comparison (optional)
    Returns:
        image_paths: List of image paths
        embeddings: Image embeddings (torch.Tensor)
        similarities: Keyword or uploaded image similarities (numpy.ndarray)
    """
    image_paths = [
        os.path.join(IMAGE_DIR, f) for f in os.listdir(IMAGE_DIR)
        if f.lower().endswith(('.png', '.jpg', '.jpeg'))
    ]
    
    if not image_paths:
        raise ValueError("No images found in the image directory")

    embeddings = []
    model.eval()
    for i in range(0, len(image_paths), BATCH_SIZE):
        batch_paths = image_paths[i:i + BATCH_SIZE]
        images = [Image.open(path).convert('RGB') for path in batch_paths]
        inputs = processor(images=images, return_tensors="pt", padding=True).to(DEVICE)
        
        with torch.no_grad():
            image_features = model.get_image_features(**inputs)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        
        if use_captions and captions_dict:
            captions = [captions_dict.get(path, "No caption available") for path in batch_paths]
            text_inputs = processor(text=captions, return_tensors="pt", padding=True, truncation=True).to(DEVICE)
            with torch.no_grad():
                text_features = model.get_text_features(**text_inputs)
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            combined_features = (image_features + text_features) / 2
            embeddings.append(combined_features)
        else:
            embeddings.append(image_features)
    
    embeddings = torch.cat(embeddings, dim=0)
    
    if uploaded_image_path:
        uploaded_embedding = generate_single_image_embedding(model, processor, uploaded_image_path)
        similarities = compute_image_similarity(embeddings, uploaded_embedding)
        if keyword:
            keyword_similarities = compute_similarities(embeddings, keyword, model, processor)
            similarities = (similarities + keyword_similarities) / 2  # Combine image and keyword similarities
    else:
        similarities = compute_similarities(embeddings, keyword or "default", model, processor)
    
    return image_paths, embeddings, similarities

def generate_single_image_embedding(model, processor, image_path):
    """
    Generate embedding for a single image.
    Args:
        model: CLIPModel
        processor: CLIPProcessor
        image_path: Path to the image
    Returns:
        embedding: Normalized image embedding (torch.Tensor)
    """
    model.eval()
    image = Image.open(image_path).convert('RGB')
    inputs = processor(images=[image], return_tensors="pt", padding=True).to(DEVICE)
    
    with torch.no_grad():
        embedding = model.get_image_features(**inputs)
        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
    
    return embedding.squeeze(0)

def compute_similarities(embeddings, keyword, model, processor):
    """
    Compute similarities between image embeddings and a keyword.
    """
    model.eval()
    text_inputs = processor(text=[keyword], return_tensors="pt", padding=True).to(DEVICE)
    with torch.no_grad():
        text_features = model.get_text_features(**text_inputs)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
    
    similarities = (embeddings @ text_features.T).squeeze().cpu().numpy()
    return similarities

def compute_image_similarity(embeddings, uploaded_embedding):
    """
    Compute similarities between database image embeddings and an uploaded image embedding.
    Args:
        embeddings: Database image embeddings (torch.Tensor)
        uploaded_embedding: Uploaded image embedding (torch.Tensor)
    Returns:
        similarities: Cosine similarities (numpy.ndarray)
    """
    uploaded_embedding = uploaded_embedding.unsqueeze(0) if uploaded_embedding.dim() == 1 else uploaded_embedding
    similarities = (embeddings @ uploaded_embedding.T).squeeze().cpu().numpy()
    return similarities