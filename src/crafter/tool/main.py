from flask import Flask, request, jsonify
import generate
from json_op import available_path, save_json

app = Flask(__name__)

@app.route('/api/generate', methods=['POST'])
def handle_generation():
    try:
        # 获取请求数据
        data = request.json
        if not data:
            return jsonify({"status": "fail", "message": "No JSON data provided"}), 400
        
        # 获取参数
        desire = data.get('desire', '')
        whole = data.get('whole', False)
        div = data.get('div', 'gene')
        merge = data.get('merge', 'hand')
        
        # 验证必要参数
        if not desire:
            return jsonify({"status": "fail", "message": "No description provided"}), 400
        
        # 验证参数值的合法性
        if div not in ['gene', 'clip', 'prefabs']:
            return jsonify({"status": "fail", "message": "Invalid division method"}), 400
            
        if merge not in ['params', 'hand']:
            return jsonify({"status": "fail", "message": "Invalid merge method"}), 400
        
        # 调用生成函数
        if whole:
            final_dic, res = generate.whole_generate(desire)
            gen_method = "whole"
        else:
            final_dic, res = generate.merge_generate(desire, div=div, merge=merge)
            gen_method = f"{div}-{merge}"
        
        # 处理结果
        if res:
            filepath = available_path()
            save_json(final_dic, filepath)
            
            response = {
                "status": "success",
                "path": filepath,
                "generation_method": gen_method,
                "message": "Model generated successfully"
            }
            return jsonify(response), 200
        else:
            return jsonify({
                "status": "fail", 
                "path": None,
                "message": "Failed to generate model"
            }), 500
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"An unexpected error occurred: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)