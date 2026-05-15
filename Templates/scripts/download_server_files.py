import paramiko
import sys

host = '45.148.127.9'
port = 22
user = 'root'
password = 'mxDuPLHw8i7KHGYz'

files = [
    '/opt/finance-bot/ai_normalize.py',
    '/opt/finance-bot/obsidian.py',
    '/opt/finance-bot/bot.py',
    '/opt/finance-bot/receipt_api.py',
    '/opt/finance-bot/config.py',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=10)

for remote_path in files:
    stdin, stdout, stderr = client.exec_command(f'cat "{remote_path}"')
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    local_name = remote_path.split('/')[-1]
    with open(f'/tmp/opencode/{local_name}', 'w', encoding='utf-8') as f:
        f.write(out)
    print(f"Downloaded {remote_path} ({len(out)} chars)")
    if err.strip():
        print(f"  STDERR: {err.strip()}")

client.close()
print("Done")
