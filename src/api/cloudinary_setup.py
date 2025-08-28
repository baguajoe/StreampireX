import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
import json
from cloudinary import CloudinaryImage

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def uploadFile(file, filename):
    """
    Upload file to Cloudinary with proper resource type detection
    """
    try:
        # Detect file type from filename extension
        file_extension = filename.lower().split('.')[-1] if '.' in filename else ''
        
        # Determine resource type based on file extension
        if file_extension in ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma']:
            # Use 'raw' for audio files to avoid codec issues
            resource_type = "raw"
            print(f"🎵 Uploading audio file as raw: {filename}")
        elif file_extension in ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']:
            resource_type = "video"
            print(f"🎬 Uploading video file: {filename}")
        elif file_extension in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']:
            resource_type = "image"
            print(f"🖼️ Uploading image file: {filename}")
        else:
            # Default to raw for unknown types
            resource_type = "raw"
            print(f"📄 Uploading unknown file type as raw: {filename}")

        # Upload the file with appropriate resource type
        upload_result = cloudinary.uploader.upload(
            file, 
            public_id=filename, 
            unique_filename=True, 
            overwrite=False, 
            resource_type=resource_type
        )

        # Build the URL for the file
        srcURL = upload_result["secure_url"]
        
        print(f"✅ File uploaded successfully: {srcURL}")
        return srcURL

    except Exception as e:
        print(f"❌ Cloudinary upload error: {str(e)}")
        raise Exception(f"Failed to upload file to Cloudinary: {str(e)}")

def getAssetInfo():
    # Get and use details of the image
    # ==============================

    # Get image details and save it in the variable 'image_info'.
    image_info = cloudinary.api.resource("quickstart_butterfly")
    print("****3. Get and use details of the image****\nUpload response:\n", json.dumps(image_info, indent=2), "\n")

    # Assign tags to the uploaded image based on its width. Save the response to the update in the variable 'update_resp'.
    if image_info["width"] > 900:
        update_resp = cloudinary.api.update("quickstart_butterfly", tags=["large"])
    elif image_info["width"] > 500:
        update_resp = cloudinary.api.update("quickstart_butterfly", tags=["medium"])
    else:
        update_resp = cloudinary.api.update("quickstart_butterfly", tags=["small"])

    # Log the new tag to the console.
    print("New tag: ", update_resp["tags"], "\n")