import generate
from json_op import available_path, save_json

def interface():
    # dumb interface
    desire = "一根竖直的杆子，由五个同轴不同半径的圆柱体组成，圆柱面上下对齐拼接但相互不相交"
    whole = False
    div = "clip"
    merge = "hand"
    return desire, whole, div, merge

if __name__ == "__main__":
    while True:
        # TODO: set real input interface
        desire, whole, div, merge = interface()
        if whole:
            final_dic, res = generate.whole_generate(desire)
        else:
            final_dic, res = generate.merge_generate(desire, div=div, merge=merge)

        if res:
            filepath = available_path()
            save_json(final_dic, filepath)
            message = {
                "status": "SUCCESS",
                "path": filepath
            }
        else:
            message = {
                "status": "fail",
                "path": None
            }

        # TODO: set output interface to get the message
        

        # TODO: remove this break
        break