import subprocess
from pathlib import Path

OUTPUT_DIR = Path("uploads/renders")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def run_ffmpeg_render(input_path: str, output_name: str, format_name="mp4"):
    output_file = OUTPUT_DIR / f"{output_name}.{format_name}"

    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-c:v", "libx264" if format_name == "mp4" else "prores_ks",
        "-preset", "fast",
        str(output_file)
    ]

    try:
        subprocess.run(cmd, check=True)
        return {
            "status": "success",
            "output": str(output_file)
        }
    except subprocess.CalledProcessError as e:
        return {
            "status": "error",
            "error": str(e)
        }
