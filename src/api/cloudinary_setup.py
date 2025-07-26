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

def uploadFile(file, filename, filetype):

  # Upload the image and get its URL
  # ==============================

  # Upload the image.
  # Set the asset's public ID and allow overwriting the asset with new versions
  cloudinary.uploader.upload(file, public_id=filename, unique_filename = True, overwrite=False)

  # Build the URL for the image and save it in the variable 'srcURL'
  srcURL = CloudinaryImage("quickstart_butterfly").build_url()

  # Log the image URL to the console. 
  # Copy this URL in a browser tab to generate the image on the fly.
  print("****2. Upload an image****\nDelivery URL: ", srcURL, "\n")

def getAssetInfo():

  # Get and use details of the image
  # ==============================

  # Get image details and save it in the variable 'image_info'.
  image_info=cloudinary.api.resource("quickstart_butterfly")
  print("****3. Get and use details of the image****\nUpload response:\n", json.dumps(image_info,indent=2), "\n")

  # Assign tags to the uploaded image based on its width. Save the response to the update in the variable 'update_resp'.
  if image_info["width"]>900:
    update_resp=cloudinary.api.update("quickstart_butterfly", tags = "large")
  elif image_info["width"]>500:
    update_resp=cloudinary.api.update("quickstart_butterfly", tags = "medium")
  else:
    update_resp=cloudinary.api.update("quickstart_butterfly", tags = "small")

  # Log the new tag to the console.
  print("New tag: ", update_resp["tags"], "\n")