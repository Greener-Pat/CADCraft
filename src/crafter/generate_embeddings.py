import os
import torch
import numpy as np
from PIL import Image
from config import IMAGE_DIR, DEVICE, BATCH_SIZE
from transformers import CLIPProcessor, CLIPModel

def precompute_embeddings(model, processor, output_file="embeddings.pt", captions_dict=None, use_captions=False):
    """
    Precompute and save embeddings for all images in IMAGE_DIR.
    Args:
        model: CLIPModel
        processor: CLIPProcessor
        output_file: Path to save the embeddings (torch .pt file)
        captions_dict: Dictionary mapping image paths to captions
        use_captions: Whether to use captions for text embeddings
    Returns:
        image_paths: List of image paths
        embeddings: Image embeddings (torch.Tensor)
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
    
    # Save embeddings and image paths
    torch.save({
        'image_paths': image_paths,
        'embeddings': embeddings
    }, output_file)
    print(f"Saved embeddings to {output_file}")
    
    return image_paths, embeddings

def load_precomputed_embeddings(input_file="embeddings.pt"):
    """
    Load precomputed embeddings from file.
    Args:
        input_file: Path to the saved embeddings file
    Returns:
        image_paths: List of image paths
        embeddings: Image embeddings (torch.Tensor)
    """
    if not os.path.exists(input_file):
        raise FileNotFoundError(f"Embeddings file {input_file} not found")
    
    data = torch.load(input_file)
    return data['image_paths'], data['embeddings']

def generate_embeddings(model, processor, keyword=None, captions_dict=None, use_captions=False, uploaded_image_path=None, embeddings_file="embeddings.pt"):
    """
    Generate or load image embeddings for database images.
    Args:
        model: CLIPModel
        processor: CLIPProcessor
        keyword: Search keyword (optional)
        captions_dict: Dictionary mapping image paths to captions
        use_captions: Whether to use captions for text embeddings
        uploaded_image_path: Path to uploaded image for similarity comparison (optional)
        embeddings_file: Path to precomputed embeddings file
    Returns:
        image_paths: List of image paths
        embeddings: Image embeddings (torch.Tensor)
        similarities: Keyword or uploaded image similarities (numpy.ndarray)
    """
    # Try to load precomputed embeddings
    if os.path.exists(embeddings_file):
        image_paths, embeddings = load_precomputed_embeddings(embeddings_file)
    else:
        # Compute and save embeddings
        image_paths, embeddings = precompute_embeddings(model, processor, embeddings_file, captions_dict, use_captions)
    
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
