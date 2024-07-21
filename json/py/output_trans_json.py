import json

def extract_key_desc(json_file, output_file):
    # JSONファイルを読み込む
    with open(json_file, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    # 結果を格納する辞書
    result = {}

    # 再帰的にキーとDescを抽出する関数
    def extract(data):
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, dict) and 'Desc' in value:
                    result[key] = value['Desc']
                else:
                    extract(value)

    # JSONデータからキーとDescを抽出
    extract(data)
    
    # 結果をJSONファイルに書き込む
    with open(output_file, 'w', encoding='utf-8') as outfile:
        json.dump(result, outfile, ensure_ascii=False, indent=4)

# 使用例
json_file = '00_prompt_pony_base_back.json'
output_file = 'output.json'
extract_key_desc(json_file, output_file)
print(f'結果が{output_file}に出力されました。')
