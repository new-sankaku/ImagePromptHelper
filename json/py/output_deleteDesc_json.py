import json

def remove_desc(input_filename, output_filename):
    # JSONファイルを読み込む
    with open(input_filename, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Descフィールドを削除する再帰関数
    def delete_desc(d):
        if isinstance(d, dict):
            if 'Desc' in d:
                del d['Desc']
            for key in d:
                delete_desc(d[key])
        elif isinstance(d, list):
            for item in d:
                delete_desc(item)

    # データからDescフィールドを削除
    delete_desc(data)

    # 結果を新しいファイルに出力
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# 入力ファイル名と出力ファイル名を指定
input_filename = '00_prompt_pony_base.json'
output_filename = 'output.json'

# Descフィールドを削除
remove_desc(input_filename, output_filename)
