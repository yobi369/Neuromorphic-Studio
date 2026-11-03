"""Execute generated framework code on CPU and compile the embedded C kernel."""
from pathlib import Path
import subprocess
import sys

root=Path("validation/generated")
snntorch_file=root/"neuromorphicsmoke_snntorch.py"
lava_file=root/"neuromorphicsmoke_lava.py"
c_file=root/"neuromorphicsmoke_embedded.c"
for file in (snntorch_file,lava_file,c_file):
    if not file.exists():
        raise SystemExit(f"Missing generated artifact: {file}")

# Actual snnTorch forward pass using installed PyTorch/snnTorch.
subprocess.run([sys.executable,str(snntorch_file)],check=True,timeout=60)
# Run Lava's CPU floating-point simulator; this is not a physical Loihi test.
subprocess.run([sys.executable,str(lava_file)],check=True,timeout=120)
# Compile the generated portable C99 kernel with warnings treated as errors.
subprocess.run(["gcc","-std=c99","-Wall","-Wextra","-Werror","-c",str(c_file),"-o","/tmp/neuromorphic-export.o"],check=True,timeout=30)
print("snnTorch CPU execution, Lava simulator execution and embedded C compilation passed.")
