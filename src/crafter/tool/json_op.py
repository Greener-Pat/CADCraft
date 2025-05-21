import os
import json
from calling import kimi, deepseek

def load_json(filepath, dump=False):
	with open(filepath, 'r', encoding='utf-8') as file:
		cad = json.load(file)
	if dump:
		cad = json.dumps(cad, indent=4)
	print(f"Load from {filepath}")
	return cad

def available_path(dirpath='../outputs/'):
    idx = 0
    while os.path.exists(dirpath + f"generate{str(idx)}.json"):
        idx += 1
    return dirpath + f"generate{str(idx)}.json"

def save_json(json_dic, filepath):
	with open(filepath, "w", encoding='utf-8') as file:
		json.dump(json_dic, file, indent=4)
	print(f"Save to {filepath}")

def json_generate(prompt, model_call=kimi, limit=3, save=True):
	count = 0
	history = []
	while count < limit:
		gene_s, history = model_call(prompt, history)
		if gene_s.count('```') >= 2:
			start = gene_s.find('```json\n')
			gene_s = gene_s[start+8:]
			end = gene_s.find('```')
			gene_json = json.loads(gene_s[:end])
			print("Succeed")
			if save:
				savepath = available_path('../inter_result/')
				save_json(gene_json, savepath)
			return gene_json, True
		else:
			count += 1
			print("Go on...")
			print(gene_s)
			prompt = "继续生成"

	print("Fail")
	failpath = available_path("../fail/")
	with open(failpath, "w", encoding="utf-8") as file:
		file.write(gene_s)
	return failpath, False