from PIL import Image

def crop_transparent(img_path):
    img = Image.open(img_path).convert("RGBA")
    # Get bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        # Crop the image to the bounding box
        cropped_img = img.crop(bbox)
        cropped_img.save(img_path, "PNG")
        print(f"Cropped {img_path} to {bbox}")

if __name__ == "__main__":
    base_path = r"c:\Users\diwas\OneDrive\Documents\Desktop\loksewa website\apps\web\media"
    crop_transparent(base_path + r"\left-branch.png")
    crop_transparent(base_path + r"\right-branch.png")
