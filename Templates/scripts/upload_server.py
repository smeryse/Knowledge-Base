import paramiko
import sys

host = '45.148.127.9'
port = 22
user = 'root'
password = 'mxDuPLHw8i7KHGYz'

files = {
    '/tmp/opencode/ai_normalize_v2.py': '/opt/finance-bot/ai_normalize.py',
    '/tmp/opencode/obsidian_v2.py': '/opt/finance-bot/obsidian.py',
    '/tmp/opencode/bot.py': '/opt/finance-bot/bot.py',
}

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=10)

sftp = client.open_sftp()

for local, remote in files.items():
    sftp.put(local, remote)
    print(f"Uploaded {local} -> {remote}")

sftp.close()

# Restart service
stdin, stdout, stderr = client.exec_command('systemctl restart assistant-bot.service')
out = stdout.read().decode('utf-8')
err = stderr.read().decode('utf-8')
print("Restart stdout:", out.strip() or "(empty)")
print("Restart stderr:", err.strip() or "(empty)")

# Check status
stdin, stdout, stderr = client.exec_command('systemctl status assistant-bot.service --no-pager -l')
status = stdout.read().decode('utf-8')
print("\n=== Service Status ===\n")
print(status[:2000])

client.close()
print("Done")
