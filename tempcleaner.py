import os
import shutil
import tempfile

def get_size(start_path):
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(start_path):
        for f in filenames:
            try:
                fp = os.path.join(dirpath, f)
                total_size += os.path.getsize(fp)
            except:
                pass
    return total_size

def clear_folder(path):
    removed_size = 0
    if os.path.exists(path):
        for root, dirs, files in os.walk(path):
            for name in files:
                try:
                    file_path = os.path.join(root, name)
                    removed_size += os.path.getsize(file_path)
                    os.remove(file_path)
                except:
                    pass
            for name in dirs:
                try:
                    shutil.rmtree(os.path.join(root, name), ignore_errors=True)
                except:
                    pass
    return removed_size

def bytes_to_mb(bytes_size):
    return bytes_size / (1024 * 1024)

def main():
    print("Čištění dočasných souborů...\n")

    temp_path = tempfile.gettempdir()
    windows_temp = r"C:\Windows\Temp"
    update_cache = r"C:\Windows\SoftwareDistribution\Download"

    total_removed = 0

    for path in [temp_path, windows_temp, update_cache]:
        print(f"Čistím: {path}")
        removed = clear_folder(path)
        total_removed += removed

    print("\nHotovo!")
    print(f"Uvolněno přibližně: {bytes_to_mb(total_removed):.2f} MB")

if __name__ == "__main__":
    main()import os
import shutil
import tempfile

def get_size(start_path):
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(start_path):
        for f in filenames:
            try:
                fp = os.path.join(dirpath, f)
                total_size += os.path.getsize(fp)
            except:
                pass
    return total_size

def clear_folder(path):
    removed_size = 0
    if os.path.exists(path):
        for root, dirs, files in os.walk(path):
            for name in files:
                try:
                    file_path = os.path.join(root, name)
                    removed_size += os.path.getsize(file_path)
                    os.remove(file_path)
                except:
                    pass
            for name in dirs:
                try:
                    shutil.rmtree(os.path.join(root, name), ignore_errors=True)
                except:
                    pass
    return removed_size

def bytes_to_mb(bytes_size):
    return bytes_size / (1024 * 1024)

def main():
    print("Čištění dočasných souborů...\n")

    temp_path = tempfile.gettempdir()
    windows_temp = r"C:\Windows\Temp"
    update_cache = r"C:\Windows\SoftwareDistribution\Download"

    total_removed = 0

    for path in [temp_path, windows_temp, update_cache]:
        print(f"Čistím: {path}")
        removed = clear_folder(path)
        total_removed += removed

    print("\nHotovo!")
    print(f"Uvolněno přibližně: {bytes_to_mb(total_removed):.2f} MB")

if __name__ == "__main__":
    main()