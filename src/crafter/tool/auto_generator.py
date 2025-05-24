import generate
from calling import kimi, deepseek
from json_op import available_path, save_json

def auto_generator(shapePath, savePath, whole, div, merge, num=30):
    lines = []
    with open(shapePath, 'r', encoding='utf-8') as file:
        for line in file:
            line = line.strip()
            if len(line):
                lines.append(line)
    assert len(lines) >= num

    for i in range(num):
        desire = lines[i]
        while True:
            try:
                if whole:
                    final_dic, res = generate.whole_generate(desire)
                else:
                    final_dic, res = generate.merge_generate(desire, div=div, merge=merge)
                if res:
                    filepath = available_path(savePath)
                    save_json(final_dic, filepath)
                    break
            except Exception as e:
                print(f"Error: {e}")
                print("Retrying...")
                continue

def shape_generator(shapePath, examples, num=30):
    example_s = "\n".join(examples)
    prompt = f"请按照以下格式生成{num}个CAD组件描述\n{example_s}\n"
    shapes, _ = kimi(prompt)

    lines = []
    while True:
        start = shapes.find('<s>')
        end = shapes.find('<e>')
        if start == -1 or end == -1:
            break
        lines.append(shapes[start+3:end])
        shapes = shapes[end+3:]

    with open(shapePath, "w", encoding="utf-8") as file:
        for line in lines:
            file.write(line + "\n")

if __name__ == "__main__":
    examples = [
        '<s>一个标准的长方体，六个矩形平面，所有边角均为直角。长、宽、高相等，形状类似骰子，每个面完全平整，无任何倒角或圆角<e>',
        '<s>一个竖直的圆柱，顶部和底部为完全平行的圆形平面，侧面光滑无棱角。高度与直径比例适中，类似罐头形状<e>'
        '<s>完美的球形曲面，表面完全光滑，无任何棱角或平面。从任何角度观察均为正圆，类似乒乓球或篮球的几何形态<e>'
    ]
    # shape_generator("./QualityTesting/test.txt", examples, num=5)
    auto_generator("./QualityTesting/test.txt", "./QualityTesting/outputs/", True, 'prefabs', 'hand', num=4)
