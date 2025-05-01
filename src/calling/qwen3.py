import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

class Qwen3Model:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")    
        self.model_name = "Qwen/Qwen3-0.6B"
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            torch_dtype="auto",
            device_map=self.device
        )
    
    def call(self, input_text):
        # 直接编码原始输入文本(非对话格式)
        inputs = self.tokenizer(
            input_text, 
            return_tensors="pt",
            add_special_tokens=True  # 确保添加起始/终止标记
        ).to(self.device)
        
        # 关键参数调整(根据搜索建议[3,6,8](@ref))
        output_ids = self.model.generate(
            **inputs,
            max_new_tokens=512,
            do_sample=True,          # 启用采样模式[3](@ref)
            temperature=0.7,         # 平衡生成多样性[2,8](@ref)
            top_p=0.9,               # Nucleus采样参数[2](@ref)
            repetition_penalty=1.1,  # 抑制重复[8](@ref)
            pad_token_id=self.tokenizer.eos_token_id  # 终止标记[6](@ref)
        )
        
        return self.tokenizer.decode(output_ids[0], skip_special_tokens=True)
    
    def split(self, object):
        system = "你是一个CAD图形拆解专家, 擅长用(思维链 CoT)的方式将复杂形状拆分成简单图形的组合"
        user =  "请将一个'城堡'拆封成简单几何图像的组合\n" \
                "图形部分:\n" \
                "| 编号 | 图形类型   | 尺寸参数               | 备注                  |\n" \
                "|------|------------|------------------------|-----------------------|\n" \
                "| 1    | 长方体     | 20m(长)x15m(宽)x60m(高) | 主塔主体              |\n" \
                "| 2    | 正三角形   | 底边15m, 高度10m        | 主塔尖顶              |\n" \
                "| 3    | 长方体     | 3mx2mx8m               | 城墙单元(共12个)    |\n" \
                "| 4    | 圆柱体     | 半径2.5m, 高度5m        | 桥拱(旋转45°)       |\n" \
                "| 5    | 矩形       | 1mx0.2m                | 旗杆(高度=主塔1/5)  |\n" \
                "| 6    | 梯形       | 上底5m, 下底10m, 高3m   | 屋顶过渡件            |\n" \
                "组合部分\n" \
                "| 组件关系          | 参数说明                          |\n" \
                "|-------------------|-----------------------------------|\n" \
                "| 1 → 2            | 尖顶三角形以塔顶中心为基准, Y轴偏移+60m |\n" \
                "| 1 → 3            | 城墙沿X轴间距3m重复排列, Z轴基底对齐  |\n" \
                "| 1 → 4            | 桥拱中心点坐标(0, -10m, 5m), 旋转45°  |\n" \
                "| 3 → 6            | 梯形屋顶与城墙顶部接合, 倾斜角60°     |\n" \
                "| 5 → 1            | 旗杆顶端固定于主塔Y=50m处           |\n" \
                "<finish>\n" \
                f"请将一个'{object}'拆封成简单几何图像的组合\n"
        input_text = system + user
        ret = self.call(input_text)[len(input_text):]
        return ret
    
    def object_prompt(self, objects_files, cmd_file):
        objects = []
        for idx, object_file in enumerate(objects_files):
            with open(object_file, 'r', encoding='utf-8') as f:
                object = f.read()
                objects.append(f"{idx}:\n" + object)
        objects = "\n".join(objects)
        with open(cmd_file, 'r', encoding='utf-8') as f:
            cmd_word = f.read()
        prompt = "请结合以下给定的图形:\n" + objects + "\n" + "根据以下给定的要求，生成指定的CAD图形" \
            + cmd_word + "\n<output>\n"
        return prompt

    def combine(self, object_eg_files, combine_eg_cmd, combine_eg_out, combine_files, combine_cmd):
        system = "你是一个CAD图形组合专家, 擅长用(思维链 CoT)的方式将简单图形组合成复杂形状"
        eg_prompt = self.object_prompt(object_eg_files, combine_eg_cmd)
        with open(combine_eg_out, 'r', encoding='utf-8') as f:
            eg_out = f.read()
        this_prompt = self.object_prompt(combine_files, combine_cmd)
        prompt = system + "\n" + eg_prompt + eg_out + "<finish>\n" + this_prompt
        ret = self.call(prompt)[len(prompt):]
        return ret

model = Qwen3Model()
objects = ["../../data/example/cylinder.json",
           "../../data/example/L_bracket.json",
           "../../data/example/rec_board.json"]
cmd = "../../data/example/cmd.txt"
output = "../../data/example/combine.json"

ret = model.combine(objects, cmd, output, objects, cmd)
print(ret)
