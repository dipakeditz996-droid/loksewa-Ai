from PIL import Image

def make_transparent(img_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()

    # Get the background color from the top-left pixel
    bg_color = datas[0]
    
    new_data = []
    for item in datas:
        # Calculate color distance
        r_diff = abs(item[0] - bg_color[0])
        g_diff = abs(item[1] - bg_color[1])
        b_diff = abs(item[2] - bg_color[2])
        
        # If the pixel is very close to the background color, make it transparent
        if r_diff < 30 and g_diff < 30 and b_diff < 30:
            # Smooth edge alpha calculation for anti-aliasing
            diff_sum = (r_diff + g_diff + b_diff) / 3
            if diff_sum < 10:
                new_data.append((item[0], item[1], item[2], 0)) # Fully transparent
            else:
                # Partial transparency for smooth edges
                alpha = int(((diff_sum - 10) / 20) * 255)
                new_data.append((item[0], item[1], item[2], alpha))
        else:
            new_data.append(item) # Keep original pixel

    img.putdata(new_data)
    img.save(img_path, "PNG")

if __name__ == "__main__":
    base_path = r"c:\Users\diwas\OneDrive\Documents\Desktop\loksewa website\apps\web\media"
    make_transparent(base_path + r"\left-branch.png")
    make_transparent(base_path + r"\right-branch.png")
    print("Successfully removed background!")
