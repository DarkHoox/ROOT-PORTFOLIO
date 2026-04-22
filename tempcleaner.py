import os
import shutil
import tempfile
import subprocess
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import psutil

# ----------- LOG -----------

def log(msg):
    log_box.insert(tk.END, msg + "\n")
    log_box.see(tk.END)

# ----------- COMMAND RUNNER -----------

def run_cmd(cmd):
    log(f"➡️ {cmd}")
    try:
        subprocess.run(cmd, shell=True)
    except Exception as e:
        log(f"❌ Chyba: {e}")

# ----------- FUNKCE -----------

def clean_temp():
    log("🧹 Čištění dočasných souborů...")
    temp_paths = [tempfile.gettempdir(), r"C:\Windows\Temp"]
    removed = 0

    for path in temp_paths:
        if os.path.exists(path):
            for root, dirs, files in os.walk(path):
                for f in files:
                    try:
                        fp = os.path.join(root, f)
                        removed += os.path.getsize(fp)
                        os.remove(fp)
                    except:
                        pass
                for d in dirs:
                    shutil.rmtree(os.path.join(root, d), ignore_errors=True)

    log(f"✅ Uvolněno cca {removed // (1024*1024)} MB")

def fix_network():
    log("🌐 Oprava sítě...")
    cmds = [
        "ipconfig /flushdns",
        "ipconfig /release",
        "ipconfig /renew",
        "netsh winsock reset",
        "netsh int ip reset"
    ]
    for c in cmds:
        run_cmd(c)

    log("✅ Síť opravena (doporučen restart)")

def check_system():
    log("🔍 Kontrola systému (SFC)...")
    run_cmd("sfc /scannow")
    log("✅ Kontrola dokončena")

def check_health():
    log("🧠 Diagnostika systému...")
    cpu = psutil.cpu_percent()
    ram = psutil.virtual_memory().percent
    disk = psutil.disk_usage('/').percent

    log(f"CPU: {cpu}%")
    log(f"RAM: {ram}%")
    log(f"Disk: {disk}%")

    if disk > 85:
        log("⚠️ Disk je skoro plný!")
    if ram > 85:
        log("⚠️ RAM je hodně vytížená!")

def fix_all():
    progress['value'] = 0
    clean_temp()
    progress['value'] = 25

    fix_network()
    progress['value'] = 50

    check_system()
    progress['value'] = 75

    check_health()
    progress['value'] = 100

    log("🎉 Hotovo! Doporučen restart PC")

# ----------- THREAD WRAPPER -----------

def run_thread(func):
    threading.Thread(target=func).start()

# ----------- GUI -----------

root = tk.Tk()
root.title("Windows Helper PRO")
root.geometry("600x500")

title = tk.Label(root, text="Windows Helper PRO", font=("Arial", 18))
title.pack(pady=10)

frame = tk.Frame(root)
frame.pack()

tk.Button(frame, text="🧹 Vyčistit", width=20, command=lambda: run_thread(clean_temp)).grid(row=0, column=0, padx=5, pady=5)
tk.Button(frame, text="🌐 Opravit síť", width=20, command=lambda: run_thread(fix_network)).grid(row=0, column=1, padx=5)
tk.Button(frame, text="🔍 SFC kontrola", width=20, command=lambda: run_thread(check_system)).grid(row=1, column=0, padx=5, pady=5)
tk.Button(frame, text="🧠 Diagnostika", width=20, command=lambda: run_thread(check_health)).grid(row=1, column=1, padx=5)

tk.Button(root, text="🚀 FIX ALL (automaticky)", bg="green", fg="white",
          width=40, command=lambda: run_thread(fix_all)).pack(pady=10)

progress = ttk.Progressbar(root, length=400, mode='determinate')
progress.pack(pady=5)

log_box = tk.Text(root, height=15)
log_box.pack(padx=10, pady=10, fill="both", expand=True)

tk.Button(root, text="❌ Konec", command=root.quit).pack(pady=5)

root.mainloop()
