from PIL import Image, ImageDraw, ImageFilter
import sys
import os
import math

def create_squircle_mask(size, curvature=4.5):
    """
    创建一个平滑的方圆形 (Squircle) 蒙版
    """
    w, h = size
    mask = Image.new('L', size, 0)
    data = []
    
    # 中心点
    cx, cy = w / 2, h / 2
    # 半径
    rx, ry = w / 2, h / 2
    
    for y in range(h):
        for x in range(w):
            # 超椭圆公式: |x/a|^n + |y/b|^n = 1
            # 归一化坐标 (-1 到 1)
            nx = (x - cx) / rx
            ny = (y - cy) / ry
            
            # 计算距离
            d = abs(nx) ** curvature + abs(ny) ** curvature
            
            if d <= 1:
                data.append(255) # 内部
            else:
                data.append(0)   # 外部
                
    mask.putdata(data)
    return mask

def process_icon(input_path, output_path, size=(512, 512)):
    try:
        # 打开图片
        img = Image.open(input_path).convert("RGBA")
        
        # 1. 自动去除白边 (可选，为了保险起见先裁剪掉周围一圈)
        # 或者简单的，我们直接缩放图片到稍微大一点，然后居中裁剪，这样可以把边缘的白线切掉
        width, height = img.size
        # 裁剪掉 5% 的边缘
        crop_margin = int(min(width, height) * 0.05)
        img = img.crop((crop_margin, crop_margin, width - crop_margin, height - crop_margin))
        
        # 2. 调整大小为目标尺寸
        img = img.resize(size, Image.LANCZOS)
        
        # 3. 创建 Squircle 蒙版 (微信 icon 风格)
        # 4x 采样以抗锯齿
        super_size = (size[0] * 4, size[1] * 4)
        mask = create_squircle_mask(super_size, curvature=4.0)
        mask = mask.resize(size, Image.LANCZOS)
        
        # 4. 应用蒙版
        output = Image.new('RGBA', size, (0, 0, 0, 0))
        output.paste(img, (0, 0), mask=mask)
        
        # 保存 PNG
        output.save(output_path, "PNG")
        print(f"Generated squircle icon at: {output_path}")
        
        # 另存为 ICO (包含多尺寸，这对 Windows 显示至关重要)
        ico_path = output_path.replace('.png', '.ico')
        output.save(ico_path, format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
        print(f"Generated ICO at: {ico_path}")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(current_dir, "icon1.png")
    output_path = os.path.join(current_dir, "icon.png")
    
    # 生成 256x256 的图标
    process_icon(input_path, output_path, size=(256, 256))
