import boto3
import os
from botocore.client import Config

R2_ENDPOINT   = os.environ.get('R2_ENDPOINT_URL', '')
R2_ACCESS_KEY = os.environ.get('R2_ACCESS_KEY', '')
R2_SECRET_KEY = os.environ.get('R2_SECRET_KEY', '')
R2_BUCKET     = os.environ.get('R2_BUCKET_NAME', 'streampirex-media')
R2_PUBLIC_URL = os.environ.get('R2_PUBLIC_URL', 'https://pub-3a956be9429449469ec53b73495e.r2.dev')

def get_r2_client():
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=Config(signature_version='s3v4'),
        region_name='auto',
    )

def upload_to_r2(file_obj, key, content_type='application/octet-stream', bucket=None):
    client = get_r2_client()
    bucket = bucket or R2_BUCKET
    client.upload_fileobj(
        file_obj,
        bucket,
        key,
        ExtraArgs={'ContentType': content_type},
    )
    return f"{R2_PUBLIC_URL}/{key}"
