import os
import csv
from transformers import CLIPProcessor, CLIPModel
from embedding import generate_embeddings, DEVICE

def load_captions():
    captions = {}
    pth_paths = {}  # 独立字典
    captions_file = 'data.csv'
    if not os.path.exists(captions_file):
        return captions, pth_paths
    with open(captions_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) >= 3:
                image_path = row[0].strip('"')
                captions[image_path] = row[1]
                pth_paths[image_path] = row[2].strip()  # 独立存储
    return captions, pth_paths  # 返回两个独立字典

model_name = "laion/CLIP-ViT-L-14-DataComp.XL-s13B-b90K"
clip_model = CLIPModel.from_pretrained(model_name).to(DEVICE)
clip_processor = CLIPProcessor.from_pretrained(model_name)
captions_dict, pth_paths_dict = load_captions()

'''
这里是原来关键词查top图片的那个
参数说明：
    keyword是一段文本， 
    n_images是要输出top多少的，
    use_captions是要不要用caption
返回值：
    top_images:是一个数组里面有n_images个字典，每个字典有：
        "filename":图片文件名
        "similarity": 相似度数值
        "path":图片路径
        "caption": 描述字段
        "pth_path": CAD文件路径
    error就是error
'''
def top_images_view(keyword, n_images, use_captions):
    error = None
    top_images = []
    use_captions = False

    if not keyword:
        error = "关键词为空"
    elif not n_images:
        error = "无图片数量"
    else:
        try:
            if n_images < 1 or n_images > 1000:
                error = "数量不在1-1000"
            else:
                image_paths, _, similarities = generate_embeddings(
                    clip_model, clip_processor, keyword, captions_dict, use_captions
                )
                results = [
                    {
                    "filename": os.path.basename(path),
                    "similarity": sim,
                    "path": path,
                    "caption": captions_dict.get(path, "No caption") if use_captions else "Captions disabled",
                    "pth_path": pth_paths_dict.get(path, "No pth path")  # 始终包含
                    }
                    for path, sim in zip(image_paths, similarities)
                ]
                top_images = sorted(results, key=lambda x: x["similarity"], reverse=True)[:n_images]
        except ValueError:
            error = "非有效的正整数"
        except Exception as e:
            error = f"计算相似度失败: {e}"

    return top_images, error