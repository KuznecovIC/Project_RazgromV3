from PIL import Image
import numpy as np

def get_dominant_color(image_path):
    img = Image.open(image_path).convert('RGB')
    img = img.resize((64, 64))

    pixels = np.array(img).reshape(-1, 3)
    avg = pixels.mean(axis=0)

    return '#%02x%02x%02x' % tuple(avg.astype(int))
