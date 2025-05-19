from flask import Flask, request, jsonify, send_from_directory
import generate
from json_op import available_path, save_json
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# 设置输出文件夹路径
OUTPUT_FOLDER = os.path.join(os.path.dirname(__file__), '../outputs')

@app.route('/api/generate', methods=['POST','GET'])
def handle_generation():
    try:
        data = request.json
        if not data:
            return jsonify({"status": "fail", "message": "No JSON data provided"}), 400
        
        desire = data.get('desire', '一根竖直的杆子，由三个同轴不同半径的圆柱体组成，圆柱面上下对齐拼接但相互不相交')
        whole = data.get('whole', False)
        div = data.get('div', 'gene')
        merge = data.get('merge', 'hand')
        
        if not desire:
            return jsonify({"status": "fail", "message": "No description provided"}), 400
        
        if div not in ['gene', 'clip', 'prefabs']:
            return jsonify({"status": "fail", "message": "Invalid division method"}), 400
            
        if merge not in ['params', 'hand']:
            return jsonify({"status": "fail", "message": "Invalid merge method"}), 400
        
        if whole:
            final_dic, res = generate.whole_generate(desire)
            gen_method = "whole"
        else:
            final_dic, res = generate.merge_generate(desire, div=div, merge=merge)
            gen_method = f"{div}-{merge}"
        
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

@app.route('/outputs/<filename>')
def get_generated_file(filename):
    try:
        return send_from_directory(OUTPUT_FOLDER, filename)
    except FileNotFoundError:
        return jsonify({"status": "error", "message": "File not found"}), 404

if __name__ == "__main__":
    # 确保输出目录存在
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)
    app.run(debug=True, host='0.0.0.0', port=5000)