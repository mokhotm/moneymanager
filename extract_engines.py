import gzip
import os
import shutil

money_dir = r"c:\Ezzy\Projects\Money"

for name in ["schema-engine", "query-engine"]:
    gz_path = os.path.join(money_dir, f"{name}.exe.gz")
    exe_path = os.path.join(money_dir, f"{name}.exe")
    if os.path.exists(gz_path):
        with gzip.open(gz_path, "rb") as f_in:
            with open(exe_path, "wb") as f_out:
                shutil.copyfileobj(f_in, f_out)
        print(f"Extracted {exe_path} (size: {os.path.getsize(exe_path)} bytes)")

