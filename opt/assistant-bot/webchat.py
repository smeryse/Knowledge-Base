import os
import json
import requests
from flask import Flask, request, jsonify, render_template_string, session, redirect, url_for

app = Flask(__name__)
app.secret_key = os.urandom(32).hex()

OPENROUTER_KEY = None
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(dotenv_path):
    with open(dotenv_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith('OPENROUTER_API_KEY='):
                OPENROUTER_KEY = line.split('=', 1)[1].strip().strip("'\"")

CHAT_PASSWORD = os.environ.get('CHAT_PASSWORD', 'test2026')

HTML = r"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Личный кабинет ЭИОС</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'PT Sans', 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; color: #333; height: 100vh; display: flex; flex-direction: column; }
  a { color: #1a7e34; text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* top bar */
  .top-bar { background: #1a7e34; color: #fff; font-size: 0.78rem; padding: 0.4rem 1.25rem; display: flex; justify-content: flex-end; gap: 1.2rem; }
  .top-bar a { color: #fff; }

  /* login */
  .login-wrap { display: flex; align-items: center; justify-content: center; flex: 1; }
  .login-card { background: #fff; border-radius: 4px; box-shadow: 0 1px 6px rgba(0,0,0,0.1); width: 400px; padding: 2rem 2.5rem; }
  .login-card .logo-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  .login-card .logo-row svg { flex-shrink: 0; }
  .login-card .logo-row h1 { font-size: 1.1rem; font-weight: 600; color: #1a7e34; line-height: 1.3; }
  .login-card .subtitle { font-size: 0.8rem; color: #888; margin-bottom: 1.5rem; }
  .login-card label { display: block; font-size: 0.85rem; font-weight: 600; color: #444; margin-bottom: 0.3rem; }
  .login-card input { width: 100%; padding: 0.6rem 0.8rem; margin-bottom: 0.2rem; border: 1px solid #ccc; border-radius: 3px; font-size: 0.9rem; font-family: inherit; outline: none; }
  .login-card input:focus { border-color: #1a7e34; box-shadow: 0 0 0 2px rgba(26,126,52,0.12); }
  .login-card .hint { font-size: 0.72rem; color: #999; margin-bottom: 0.85rem; }
  .login-card button { width: 100%; padding: 0.65rem; border: none; border-radius: 3px; background: #1a7e34; color: #fff; font-size: 0.9rem; font-weight: 600; cursor: pointer; font-family: inherit; }
  .login-card button:hover { background: #15662b; }

  /* main layout */
  .page { max-width: 960px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; min-height: 100vh; background: #fff; box-shadow: 0 0 20px rgba(0,0,0,0.06); }
  .page-header { background: linear-gradient(to right, #1a7e34, #238b3f); color: #fff; padding: 0.75rem 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
  .page-header svg { flex-shrink: 0; }
  .page-header .header-title { flex: 1; }
  .page-header .header-title h2 { font-size: 1rem; font-weight: 600; }
  .page-header .header-title p { font-size: 0.72rem; opacity: 0.85; }
  .page-header .header-status { font-size: 0.72rem; padding: 0.25rem 0.6rem; background: rgba(255,255,255,0.15); border-radius: 3px; }
  .messages { flex: 1; overflow-y: auto; padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; background: #fafafa; }
  .msg { max-width: 80%; padding: 0.6rem 0.9rem; line-height: 1.5; font-size: 0.9rem; white-space: pre-wrap; }
  .msg.user { align-self: flex-end; background: #1a7e34; color: #fff; border-radius: 4px 4px 2px 4px; }
  .msg.assistant { align-self: flex-start; background: #ebf3ed; color: #333; border-radius: 4px 4px 4px 2px; }
  .msg.assistant strong { color: #1a7e34; }
  .msg.error { align-self: center; background: #fef2f2; color: #b91c1c; max-width: 100%; font-size: 0.8rem; text-align: center; border-radius: 3px; }
  .msg.system { align-self: center; background: #f0f7f1; color: #1a7e34; font-size: 0.78rem; border-radius: 3px; }
  .input-area { padding: 0.75rem 1.5rem; background: #fff; border-top: 1px solid #e0e0e0; display: flex; gap: 0.5rem; align-items: flex-end; }
  .input-area textarea { flex: 1; padding: 0.55rem 0.8rem; border: 1px solid #ccc; border-radius: 3px; background: #fafafa; color: #333; font-size: 0.9rem; font-family: inherit; resize: none; min-height: 38px; max-height: 120px; outline: none; }
  .input-area textarea:focus { border-color: #1a7e34; box-shadow: 0 0 0 2px rgba(26,126,52,0.08); }
  .input-area textarea::placeholder { color: #aaa; }
  .input-area button { padding: 0.55rem 1.4rem; border: none; border-radius: 3px; background: #1a7e34; color: #fff; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; height: 38px; }
  .input-area button:disabled { opacity: 0.4; cursor: not-allowed; }
  .input-area button:hover:not(:disabled) { background: #15662b; }
  .page-footer { padding: 0.7rem 1.5rem; background: #f5f5f5; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; font-size: 0.72rem; color: #999; }
  .page-footer a { color: #1a7e34; }

  /* breadcrumb style */
  .breadcrumb { padding: 0.5rem 1.5rem; font-size: 0.78rem; color: #888; border-bottom: 1px solid #e8e8e8; }
  .breadcrumb a { color: #1a7e34; }
</style>
</head>
<body>
{% if not logged_in %}
<div class="top-bar">
  <a href="#">Рус</a>
  <a href="#">Eng</a>
</div>
<div class="login-wrap">
  <div class="login-card">
    <div class="logo-row">
      <svg width="36" height="36" viewBox="0 0 100 100" fill="#1a7e34"><rect x="10" y="30" width="80" height="50" rx="4"/><polygon points="50,10 10,30 90,30"/><rect x="35" y="45" width="30" height="20" rx="2" fill="#fff"/></svg>
      <h1>Кубанский государственный университет</h1>
    </div>
    <p class="subtitle">вход в личный кабинет ЭИОС</p>
    <form method="POST">
      <label for="pw">Пароль</label>
      <input type="password" id="pw" name="password" placeholder="" required autofocus>
      <p class="hint">Укажите пароль, соответствующий вашему имени пользователя</p>
      <button type="submit">Войти</button>
    </form>
    {% if error %}<p style="color:#b91c1c;margin-top:0.75rem;font-size:0.85rem;">{{ error }}</p>{% endif %}
  </div>
</div>
{% else %}
<div class="top-bar">
  <a href="#">Рус</a>
  <a href="#">Eng</a>
  <span style="margin-left:auto;opacity:0.7;">{{ session.get('user', 'Пользователь') }}</span>
</div>
<div class="page">
  <div class="page-header">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    <div class="header-title">
      <h2>Техническая поддержка ЭИОС</h2>
      <p>ФГБОУ ВО «Кубанский государственный университет»</p>
    </div>
    <span class="header-status">&#9679; online</span>
  </div>
  <div class="breadcrumb">
    <a href="#">Главная</a> &rsaquo; <a href="#">Сервисы</a> &rsaquo; Техническая поддержка
  </div>
  <div class="messages" id="messages">
    <div class="msg system">Здравствуйте! Это чат технической поддержки электронной информационно-образовательной среды университета. Опишите вашу проблему.</div>
  </div>
  <div class="input-area">
    <textarea id="input" rows="1" placeholder="Введите текст обращения..." onkeydown="if(event.key=='Enter'&&!event.shiftKey){event.preventDefault();send();}"></textarea>
    <button id="sendBtn" onclick="send()">Отправить</button>
  </div>
  <div class="page-footer">
    <span>&copy; 2013&ndash;2026 ФГБОУ ВО &laquo;Кубанский государственный университет&raquo;</span>
    <span><a href="#" onclick="event.preventDefault();fetch('/logout').then(()=>location.reload());return false;">Выйти</a></span>
  </div>
</div>
<script>
const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');

async function send() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  addMsg(text, 'user');
  sendBtn.disabled = true;
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: text})
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '');
    addMsg(data.reply, 'assistant');
  } catch (e) {
    addMsg('Не удалось отправить запрос. Попробуйте позже.', 'error');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

function addMsg(text, role) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.textContent = text;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}
</script>
{% endif %}
</body>
</html>"""


@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        if request.form.get('password') == CHAT_PASSWORD:
            session['logged_in'] = True
            return redirect(url_for('index'))
        return render_template_string(HTML, logged_in=False, error='Неверный пароль')
    return render_template_string(HTML, logged_in=session.get('logged_in', False))


@app.route('/logout')
def logout():
    session.clear()
    return '', 200


@app.route('/api/chat', methods=['POST'])
def chat():
    if not session.get('logged_in'):
        return jsonify({'error': 'Не авторизован'}), 401
    if not OPENROUTER_KEY:
        return jsonify({'error': 'OpenRouter API ключ не настроен'}), 500

    data = request.get_json()
    if not data or not data.get('message'):
        return jsonify({'error': 'Пустое сообщение'}), 400

    try:
        resp = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENROUTER_KEY}',
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://chat.local',
                'X-Title': 'AI Chat'
            },
            json={
                'model': 'deepseek/deepseek-chat',
                'messages': [{'role': 'user', 'content': data['message']}],
                'temperature': 0.7,
                'max_tokens': 4000
            },
            timeout=60
        )
        result = resp.json()
        if resp.status_code != 200:
            return jsonify({'error': f'OpenRouter: {result.get("error", {}).get("message", str(result))[:200]}'}), 502
        reply = result['choices'][0]['message']['content']
        return jsonify({'reply': reply})
    except requests.Timeout:
        return jsonify({'error': 'Таймаут OpenRouter'}), 504
    except Exception as e:
        return jsonify({'error': str(e)[:200]}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
