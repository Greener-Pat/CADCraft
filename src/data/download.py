from datasets import load_dataset

# 下载数据集（自动处理格式转换）
dataset = load_dataset("SadilKhan/Text2CAD", "text2cad_v1.1")  # 指定子版本[6](@ref)

# 保存到本地
dataset.save_to_disk("../../data/text2cad_data")