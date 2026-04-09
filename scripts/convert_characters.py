"""
将 selected_character_data.js 转换为 TypeScript ES Module 格式
同时从角色名中提取作品名作为 source 字段
"""
import json
import re

# 读取原始数据
with open(r'H:\Drawing\saa-2.1.0-win32-x64\saa-win32-x64\comfyui_launcher\src\data\characters.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 提取 JSON 数组
json_str = content.replace('window.FULL_CHARACTER_DB = ', '').rstrip(';').strip()
characters = json.loads(json_str)

# 从角色名中提取作品名
def extract_source(key: str) -> str:
    """从角色名中提取作品名，例如 "甘雨（原神）" -> "原神" """
    match = re.search(r'（([^）]+)）$', key)  # 中文括号
    if match:
        return match.group(1)
    match = re.search(r'\(([^)]+)\)$', key)  # 英文括号
    if match:
        return match.group(1)
    return '其他'

# 处理每个角色，添加 source 字段
processed = []
for char in characters:
    processed.append({
        'key': char['key'],
        'value': char['value'],
        'source': extract_source(char['key'])
    })

# 生成 TypeScript 文件
ts_content = f'''// 自动生成的角色数据 - {len(processed)} 个角色
// 从 selected_character_data.js 转换

export interface Character {{
  key: string;      // 中文名（带作品）
  value: string;    // 英文名
  source: string;   // 作品名
}}

export const FULL_CHARACTER_DB: Character[] = {json.dumps(processed, ensure_ascii=False, indent=2)};
'''

# 写入 TypeScript 文件
with open(r'H:\Drawing\saa-2.1.0-win32-x64\saa-win32-x64\comfyui_launcher\src\data\characters.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

print(f'成功转换 {len(processed)} 个角色')

# 统计作品数量
sources = {}
for char in processed:
    sources[char['source']] = sources.get(char['source'], 0) + 1

print(f'共 {len(sources)} 个作品')
print('Top 10 作品:')
for source, count in sorted(sources.items(), key=lambda x: -x[1])[:10]:
    print(f'  {source}: {count}')
