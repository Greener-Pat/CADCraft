import time
import clip
from json_op import load_json, json_generate

# Direct Generate
def whole_generate(desire):
	example = load_json('../examples/simple.json', dump=True)
	prompt = example + f"请按照如上给出的minimal_json格式生成一个{desire}的CAD程序。" + \
		"严格按照示例，主体包含'coordinate_system'，'extrusion'，以及'sketch'字段。" + \
		"'sketch'字段中用face描述面，face中用loop描述构成面的线，loop中只支持arc, line, circle三种，命名形如arc_1, line_2, circle_3。" + \
		"这里的点全部用'Start Point'，'Mid Point'，'End Point'字段描述，line需要start和end，arc需要start, mid end，对应的是B-ref曲线。" + \
		"circle需要'Center'和'Radius'两个子字段"
	return json_generate(prompt)

# Component & Join
## Divide
def gene_division(desire):
	example = load_json('../examples/gene_params.json', dump=True)
	prompt = example + f"请按照上述的json格式将一个'{desire}'的复杂图形拆分成小组件的组合。" +\
		"整体结构与各个字段严格按照示例，整体分为name, parts和positional relationship三个部分。" +\
		"parts中按照part_1/2/3进行编号，每个子结构中有id, description, position等参数" +\
		"id是唯一标识符，postion长为3，描述该物体相对于坐标原点的偏移量" +\
		"positional relationship为一个列表，每个元素是一个字典，描述的是各个物体的相对位置关系。" +\
		"from和to对应的是物体的id，表示这里描述的是to物体相对于from物体的位置。relationship分为三个维度，每个维度通过一个长为2的字符串列表描述" +\
		"x轴由left/right/align表示相对位置; y轴由front/back/center/none表示; z轴由up/down/align表示. 第二个维度用intersect和seperate表示是否相交" +\
		f"请按照上述的json格式将一个'{desire}'的复杂图形拆分成小组件的组合。"
	return json_generate(prompt)

def prefabs_division(desire):
	example = load_json('../examples/prefab_params.json', dump=True)
	prompt = example + f"请按照上述的json格式将一个'{desire}'的复杂图形拆分成小组件的组合。" +\
		"整体结构与各个字段严格按照示例，整体分为name, parts和positional relationship三个部分。" +\
		"parts中按照part_1/2/3进行编号，每个子结构中有id, type, description, params, position等参数" +\
		"id是唯一标识符，type只有cuboid和cylinder两种，前者params长为3，分别描述长宽高；后者params长为2，对应半径与高度。postion长为3，描述该物体相对于坐标原点的偏移量" +\
		"positional relationship为一个列表，每个元素是一个字典，描述的是各个物体的相对位置关系。" +\
		"from和to对应的是物体的id，表示这里描述的是to物体相对于from物体的位置。relationship分为三个维度，每个维度通过一个长为2的字符串列表描述" +\
		"x轴由left/right/center/none表示相对位置; y轴由front/back/center/none表示; z轴由up/down/center/none表示. 第二个维度用intersect和seperate表示是否相交" +\
		f"请按照上述的json格式将一个'{desire}'的复杂图形拆分成小组件的组合。"
	return json_generate(prompt)

## Get Component

def component_generate(shape):
	example = load_json('../basics/cuboid.json', dump=True)
	prompt = example + f"请按照上述minimal_json的格式生成一个'{shape}'的CAD程序。" + \
		"严格按照示例，包含'coordinate_system'，'extrusion'，以及'sketch'字段。" + \
		"'sketch'字段中用face描述面，face中用loop描述构成面的线，loop中只支持arc, line, circle三种，命名形如arc_1, line_2, circle_3" + \
		"这里的点全部用'Start Point'，'Mid Point'，'End Point'字段描述，line需要start和end，arc需要start, mid end，对应的是B-ref曲线。" + \
		"circle需要'Center'和'Radius'两个子字段" +\
		f"请按照上述minimal_json的格式生成一个'{shape}'的CAD程序。"
	return json_generate(prompt)

def component_clip(shape, num=1, caption=False):
	top_images, _ = clip.top_images_view(shape, num, caption)
	uid = top_images[0]['filename'][:8]
	filepath = f"../../../dataset/{uid[:4]}/{uid}/minimal_json/{uid}_merged_vlm.json"
	print(shape, filepath)
	cad = load_json(filepath)
	return cad

def cuboid_set(cuboid, params):
	l = float(params[0])
	w = float(params[1])
	lh = l / 2
	wh = w / 2
	h = float(params[2])

	loop = cuboid['sketch']['face_1']['loop_1']

	line_1 = loop['line_1']
	line_1['Start Point'] = [-lh, -wh]
	line_1['End Point'] = [-lh, wh]

	line_2 = loop['line_2']
	line_2['Start Point'] = [-lh, wh]
	line_2['End Point'] = [lh, wh]

	line_3 = loop['line_3']
	line_3['Start Point'] = [lh, wh]
	line_3['End Point'] = [lh, -wh]

	line_4 = loop['line_4']
	line_4['Start Point'] = [lh, -wh]
	line_4['End Point'] = [-lh, -wh]

	cuboid['extrusion']['extrude_depth_towards_normal'] = h

	des = cuboid['description']
	des['length'] = l
	des['width'] = w
	des['height'] = h
	des['shape'] = f"A rectangular prism with length {l}, width {w} and height {h}"
	
def cylinder_set(cylinder, params):
	radius = float(params[0])
	h = float(params[1])

	circle = cylinder['sketch']['face_1']['loop_1']['circle_1']
	circle['Center'] = [0.0, 0.0]
	circle['Radius'] = radius

	cylinder['extrusion']['extrude_depth_towards_normal'] = h

	des = cylinder['description']
	des['length'] = radius
	des['width'] = radius
	des['height'] = h
	des['shape'] = f'A circular cylinder with diameter {radius} and height {h}'
	
def component_prefab(type, params):
	cad_json = load_json(f"../basics/{type}.json")
	if type == "cuboid":
		cuboid_set(cad_json, params)		
	elif type == "cylinder":
		cylinder_set(cad_json, params)
	return cad_json

## Merge

def get_shape(obj_dic):
	if 'lenght' in obj_dic['description']:
		length = obj_dic['description']['length']
		width = obj_dic['description']['width']
	else:
		length = obj_dic['description']['radius']
		width = obj_dic['description']['radius']

	height = obj_dic['description']['height']
	return [length, width, height]

def axis_compute(base_val, ex_val, base_size, ex_size, relative):
	if relative[0] in ['left', 'front', 'down']:
		res = base_val
		if relative[1] == "seperate":
			res -= ex_size / 2
	elif relative[0] in ['right', 'back', 'up']:
		res = base_val + base_size
		if relative[1] == "seperate":
			res += ex_size / 2
	elif relative[0] == "center":
		res = base_val
	else:
		res = ex_val
	return res

def relative_compute(base_pos, ex_pos, base_shape, ex_shape, relative):
	ex_pos[0] = axis_compute(base_pos[0], ex_pos[0], base_shape[0], ex_shape[0], relative['x'])
	ex_pos[1] = axis_compute(base_pos[1], ex_pos[1], base_shape[1], ex_shape[1], relative['y'])
	ex_pos[2] = axis_compute(base_pos[2], ex_pos[2], base_shape[2], ex_shape[2], relative['z'])

def relative_set(final_dic, rela_lis):
	parts = final_dic['parts']
	for rela in rela_lis:
		base = f"part_{rela['from']}"
		extend_ids = rela['to']
		for extend_id in extend_ids:
			extend = f"part_{extend_id}"
			if base not in parts or extend not in parts:
				continue
			base_dic = parts[base]
			extend_dic = parts[extend]
			base_pos = base_dic['coordinate_system']['Translation Vector']
			ex_pos = extend_dic['coordinate_system']['Translation Vector']
			base_shape = get_shape(base_dic)
			extend_shape = get_shape(extend_dic)
			relative_compute(base_pos, ex_pos, base_shape, extend_shape, rela['relationship'])
			
def merge_gene(parts_dic, merge):
	final_dic = {
		"final_shape": parts_dic['name'],
		"parts": {}
	}
	final_parts = final_dic['parts']
	parts = parts_dic['parts']
	part_count = 0
	for part_id in parts:
		part = parts[part_id]
		cad_dic, res = component_generate(part['description'])
		if not res:
			continue
		if merge == "params":
			position = part['position']
			cad_dic['coordinate_system']['Translation Vector'] = position
		final_parts[f'part_{part_count + 1}'] = cad_dic
		part_count += 1
		if part_count % 3 == 0:
			time.sleep(40)
	if merge == "hand":
		# convert 'to' to list
		for item in parts_dic['positional relationship']:
			item['to'] = [item['to']]
		relative_set(final_dic, parts_dic['positional relationship'])
	return final_dic

def merge_clip(parts_dic, merge):
    final_dic = {
        "final_shape": parts_dic['name'],
        "parts": {}
    }
    final_parts = final_dic['parts']
    parts = parts_dic['parts']
    part_count = 0
    sub_map = {}
    for part_id in parts:
        part = parts[part_id]
        
        # top_images, _ = clip.top_images_view(part['description'], 1, False)
        # uid = top_images[0]['filename'][:8]
        # filepath = f"../../dataset/{uid[:4]}/{uid}/minimal_json/{uid}_merged_vlm.json"
        # print(part['description'], filepath)
        # part_dic = load_json(filepath)
        part_dic = component_clip(part['description'])

        if merge == "params":
            position = part['position']
        sub_map[part['id']] = []
        for sub_part_id in part_dic['parts']:
            sub_part = part_dic['parts'][sub_part_id]
            if merge == "params":
                vec = sub_part['coordinate_system']['Translation Vector']
                vec += position
            final_parts[f'part_{part_count+1}'] = sub_part
            part_count += 1
            sub_map[part['id']].append(part_count)
    if merge == "hand":
        # convert 'to' to list
        for item in parts_dic['positional relationship']:
            item['from'] = sub_map[item['from']][0]
            item['to'] = sub_map[item['to']]
        relative_set(final_dic, parts_dic['positional relationship'])
    return final_dic

def merge_prefabs(parts_dic, merge="params"):
	final_dic = {
		"final_shape": parts_dic['name'],
		"parts": {}
	}
	final_parts = final_dic['parts']
	parts = parts_dic['parts']
	for part_id in parts:
		part = parts[part_id]
		part_dic = component_prefab(part['type'], part['params'])
		if merge == "params":
			position = part['position']
			part_dic['coordinate_system']['Translation Vector'] = position
		final_parts[part_id] = part_dic
	if merge == "hand":
		# convert 'to' to list
		for item in parts_dic['positional relationship']:
			item['to'] = [item['to']]
		relative_set(final_dic, parts_dic['positional relationship'])
	return final_dic

## Whole Process

def merge_generate(desire, div="clip", merge="params"):
	if div not in ["gene", "clip", "prefabs"]:
		print(f"Invalid division method: {div}")
	if merge not in ["params", "hand"]:
		print(f"Invalid merge method: {merge}")

	print("Dividing...")
	if div == "prefabs":
		parts_dic, res = prefabs_division(desire)
		if not res:
			parts_dic = f"Fail to divide the desire shape into small parts, the result has been saved to {parts_dic}"
			return parts_dic, False
		print("Merging...")
		final_dic = merge_prefabs(parts_dic, merge)
	else:
		parts_dic, res = gene_division(desire)
		print("Merging...")
		if not res:
			parts_dic = f"Fail to divide the desire shape into small parts, the result has been saved to {parts_dic}"
			return parts_dic, False
		if div == "clip":
			final_dic = merge_clip(parts_dic, merge)
		else:
			final_dic = merge_gene(parts_dic, merge)

	final_dic['final_name'] = desire
	return final_dic, True