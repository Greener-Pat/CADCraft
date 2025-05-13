import os
import torch

# Path configurations
IMAGE_DIR = "./images/"  # Image directory
OUTPUT_DIR = "search_results"

# Model and processing parameters
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
KEYWORD = "gun"
BATCH_SIZE = 16

# UMAP parameters for dimensionality reduction
UMAP_N_COMPONENTS = 2
UMAP_N_NEIGHBORS = 15
UMAP_MIN_DIST = 0.1
UMAP_RANDOM_STATE = 42