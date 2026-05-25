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
<title>Тест по дисциплине «Операционные системы»</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Trebuchet MS', 'Segoe UI', Tahoma, sans-serif; background: #f5f7fa; color: #333; height: 100vh; display: flex; flex-direction: column; }
  a { color: #2563eb; text-decoration: none; }

  /* login */
  .login-wrap { display: flex; align-items: center; justify-content: center; flex: 1; }
  .login-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); width: 380px; padding: 2rem; text-align: center; }
  .login-card h1 { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
  .login-card p { font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.5rem; }
  .login-card input { width: 100%; padding: 0.7rem 0.9rem; margin-bottom: 1rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.95rem; font-family: inherit; outline: none; background: #f8fafc; }
  .login-card input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
  .login-card button { width: 100%; padding: 0.7rem; border: none; border-radius: 6px; background: #2563eb; color: #fff; font-size: 0.95rem; font-weight: 600; cursor: pointer; font-family: inherit; }

  /* main */
  .page { max-width: 900px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; min-height: 100vh; }

  /* moodle top */
  .moodle-nav { background: #2563eb; color: #fff; padding: 0.5rem 1.5rem; display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; }
  .moodle-nav .brand { font-weight: 700; font-size: 1rem; }
  .moodle-nav .spacer { flex: 1; }
  .moodle-nav a { color: rgba(255,255,255,0.85); font-size: 0.8rem; }

  .test-header { background: #fff; padding: 1rem 1.5rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .test-header h2 { font-size: 1.1rem; font-weight: 700; color: #1e293b; flex: 1; }
  .test-header .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
  .test-header .badge.attempt { background: #dcfce7; color: #166534; }
  .test-header .badge.state { background: #fef9c3; color: #854d0e; }
  .test-header .progress { font-size: 0.8rem; color: #64748b; }

  .test-body { display: flex; flex: 1; }

  /* sidebar */
  .sidebar { width: 170px; background: #f8fafc; border-right: 1px solid #e2e8f0; padding: 1rem; font-size: 0.78rem; flex-shrink: 0; }
  .sidebar h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; margin-bottom: 0.5rem; }
  .sidebar .q-nav { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 1rem; }
  .sidebar .q-nav a { display: block; padding: 0.3rem; text-align: center; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 0.72rem; color: #475569; background: #fff; }
  .sidebar .q-nav a.active { background: #2563eb; color: #fff; border-color: #2563eb; }
  .sidebar .q-nav a.answered { background: #dcfce7; border-color: #86efac; color: #166534; }
  .sidebar .info-row { display: flex; justify-content: space-between; padding: 0.3rem 0; font-size: 0.75rem; border-bottom: 1px solid #e2e8f0; }
  .sidebar .info-row .label { color: #94a3b8; }
  .sidebar .info-row .value { font-weight: 600; color: #1e293b; }

  /* question area */
  .content { flex: 1; display: flex; flex-direction: column; background: #fff; min-width: 0; }

  .question-box { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; }
  .question-box .q-badge { font-size: 0.72rem; color: #94a3b8; margin-bottom: 0.5rem; }
  .question-box .q-badge .flag { color: #2563eb; cursor: pointer; margin-left: 0.5rem; }
  .question-box .q-text { font-size: 0.95rem; font-weight: 600; color: #1e293b; margin-bottom: 0.3rem; line-height: 1.5; }
  .question-box .q-text code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.85rem; font-weight: 500; }
  .question-box .q-text pre { background: #f1f5f9; padding: 0.6rem; border-radius: 4px; font-size: 0.82rem; font-weight: 400; overflow-x: auto; margin: 0.4rem 0; }
  .question-box .q-text pre code { background: none; padding: 0; }
  .question-box .q-text strong { font-weight: 800; }
  .question-box .q-text em { font-style: italic; }
  .question-box .q-text ul, .question-box .q-text ol { margin: 0.3rem 0 0.3rem 1.2rem; font-weight: 400; }
  .question-box .q-score { font-size: 0.78rem; color: #64748b; margin-bottom: 1rem; }

  .msg-wrap { margin-bottom: 0.75rem; }
  .msg-wrap .q-text { font-size: 0.95rem; font-weight: 600; color: #1e293b; margin-bottom: 0.3rem; line-height: 1.5; }
  .msg-wrap .q-score { font-size: 0.78rem; color: #64748b; margin-bottom: 0.4rem; }
  .answer-choice { display: block; padding: 0.45rem 0.75rem; margin-bottom: 0.3rem; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.88rem; cursor: default; background: #fff; color: #1e293b; line-height: 1.5; }
  .answer-choice code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 3px; font-size: 0.82rem; }
  .answer-choice pre { background: #f1f5f9; padding: 0.6rem; border-radius: 4px; font-size: 0.82rem; overflow-x: auto; margin: 0.4rem 0; }
  .answer-choice pre code { background: none; padding: 0; }
  .answer-choice strong { font-weight: 700; }
  .answer-choice em { font-style: italic; }
  .answer-choice ul, .answer-choice ol { margin: 0.3rem 0 0.3rem 1.2rem; }
  .answer-choice li { margin-bottom: 0.15rem; }
  .answer-choice a { color: #2563eb; text-decoration: underline; }
  .answer-choice.selected { border-color: #2563eb; background: #eff6ff; color: #1e40af; }
  .msg.user .answer-choice { border-color: #2563eb; background: #eff6ff; }
  .msg-wrap .meta { font-size: 0.72rem; color: #94a3b8; margin-top: 0.25rem; }

  .input-area { padding: 0.75rem 1.5rem; background: #fff; border-top: 1px solid #e2e8f0; display: flex; gap: 0.5rem; align-items: flex-end; }
  .input-area textarea { flex: 1; padding: 0.55rem 0.8rem; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; font-size: 0.9rem; font-family: inherit; resize: none; min-height: 38px; max-height: 120px; outline: none; }
  .input-area textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
  .input-area textarea::placeholder { color: #94a3b8; }
  .input-area button { padding: 0.55rem 1.5rem; border: none; border-radius: 6px; background: #2563eb; color: #fff; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; height: 38px; }
  .input-area button:disabled { opacity: 0.4; cursor: not-allowed; }
  .input-area button:hover:not(:disabled) { background: #1d4ed8; }

  /* will be hidden, just for redundancy */
  .page-footer { padding: 0.6rem 1.5rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 0.72rem; color: #94a3b8; }
  .page-footer a { color: #2563eb; }
</style>
</head>
<body>
{% if not logged_in %}
<div class="login-wrap">
  <div class="login-card">
    <h1>ЭИОС КубГУ</h1>
    <p>Вход в систему тестирования</p>
    <form method="POST">
      <input type="password" name="password" placeholder="Пароль" required autofocus>
      <button type="submit">Войти</button>
    </form>
    {% if error %}<p style="color:#dc2626;margin-top:0.75rem;font-size:0.85rem;">{{ error }}</p>{% endif %}
  </div>
</div>
{% else %}
<div class="page">
  <div class="moodle-nav">
    <span class="brand">ЭИОС</span>
    <span class="spacer"></span>
    <a href="#" onclick="event.preventDefault();fetch('/logout').then(()=>location.reload());return false;">Выйти</a>
  </div>
  <div class="test-header">
    <h2>Итоговый тест. Операционные системы</h2>
    <span class="badge attempt">Вариант 0</span>
    <span class="badge state">В процессе</span>
    <span class="progress" id="qCounter">Вопрос 1 из 30</span>
  </div>
  <div class="test-body">
    <div class="sidebar">
      <h3>Навигация</h3>
      <div class="q-nav" id="qNav"></div>
      <h3 style="margin-top:0.75rem;">Информация</h3>
      <div class="info-row"><span class="label">Начало</span><span class="value" id="startTime"></span></div>
      <div class="info-row"><span class="label">Состояние</span><span class="value" id="testState">В процессе</span></div>
      <div class="info-row"><span class="label">Балл</span><span class="value">--/30</span></div>
    </div>
    <div class="content">
      <div class="question-box" id="messages">
        <div class="msg-wrap" id="welcomeMsg">
          <div class="q-badge">Навигация</div>
          <div class="q-text">Итоговый тест по дисциплине «Операционные системы»</div>
          <div class="q-score">30 вопросов. Время не ограничено.</div>
          <div class="answer-choice" style="cursor:pointer;border-color:#2563eb;background:#eff6ff;text-align:center;font-weight:600;" onclick="addMsg('Начать тест','user');sendWithText('Начать тест')">Начать тест</div>
        </div>
      </div>
      <div class="input-area">
        <textarea id="input" rows="1" placeholder="Введите ответ..." onkeydown="if(event.key=='Enter'&&!event.shiftKey){event.preventDefault();send();}"></textarea>
        <button id="sendBtn" onclick="send()">Ответить</button>
      </div>
    </div>
  </div>
  <div class="page-footer">
    <span>&copy; ЭИОС ФГБОУ ВО «КубГУ»</span>
    <span><a href="#" onclick="event.preventDefault();fetch('/logout').then(()=>location.reload());return false;">Завершить</a></span>
  </div>
</div>
<script>
const messages = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const qNav = document.getElementById('qNav');
let qCount = 0;

// Set start time
const now = new Date();
document.getElementById('startTime').textContent = now.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'});
document.getElementById('testState').textContent = 'В процессе';

// Build navigation
for (let i = 1; i <= 30; i++) {
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = i;
  if (i === 1) a.className = 'active';
  a.onclick = (e) => { e.preventDefault(); };
  qNav.appendChild(a);
}

function updateNav() {
  const links = qNav.querySelectorAll('a');
  links.forEach((a, i) => {
    a.className = i < qCount ? 'answered' : '';
  });
}

function renderMsg(text) {
  qCount++;
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';
  wrap.innerHTML = `<div class="q-badge">Вопрос ${qCount}</div><div class="q-text">${mdToHtml(text)}</div><div class="q-score">Балл: 1,00</div><div class="answer-choice">${mdToHtml(text)}</div><div class="meta">Пока нет ответа | <a href="#" style="font-size:0.72rem;">Отметить вопрос</a></div>`;
  // Remove welcome message on first question
  const welcome = document.getElementById('welcomeMsg');
  if (welcome) welcome.remove();
  messages.appendChild(wrap);
  messages.scrollTop = messages.scrollHeight;
  updateNav();
  document.getElementById('qCounter').textContent = `Вопрос ${Math.min(qCount,30)} из 30`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function mdToHtml(text) {
  let html = escapeHtml(text);
  // fenced code blocks (must be before inline code)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // bold
  html = html.replace(/\*\*(\S[^*]*?\S)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(\S[^_]*?\S)__/g, '<strong>$1</strong>');
  // italic
  html = html.replace(/\*(\S[^*]*?\S)\*/g, '<em>$1</em>');
  html = html.replace(/_(\S[^_]*?\S)_/g, '<em>$1</em>');
  // strikethrough
  html = html.replace(/~~(\S[^~]*?\S)~~/g, '<del>$1</del>');
  // unordered list
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // ordered list
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(?:<li>.*<\/li>\n?)+/g, function(m) {
    return m.includes('<ul>') ? m : '<ol>' + m.replace(/<ul>/g,'<ul style="margin:0">') + '</ol>';
  });
  // fix nested list issues: wrap consecutive li in ol
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, function(m) {
    if (m.includes('<ul>') || m.includes('<ol>')) return m;
    return '<ul>' + m + '</ul>';
  });
  // headings
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  // links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // newlines
  html = html.replace(/\n/g, '<br>');
  // clean double br
  html = html.replace(/(<br>\s*){3,}/g, '<br><br>');
  return html;
}

async function sendWithText(text) {
  input.value = '';
  sendBtn.disabled = true;
  try {
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: text})
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || '');
    renderMsg(data.reply);
  } catch (e) {
    const wrap = document.createElement('div');
    wrap.className = 'msg-wrap';
    wrap.innerHTML = '<div class="answer-choice" style="border-color:#fecaca;background:#fef2f2;color:#dc2626;text-align:center;">Ошибка соединения. Попробуйте ещё раз.</div>';
    messages.appendChild(wrap);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

async function send() {
  const text = input.value.trim();
  if (!text) return;
  const welcome = document.getElementById('welcomeMsg');
  if (welcome) welcome.remove();
  addMsg(text, 'user');
  await sendWithText(text);
}

function addMsg(text, role) {
  const wrap = document.createElement('div');
  wrap.className = 'msg-wrap';
  wrap.style.marginLeft = role === 'user' ? '2rem' : '0';
  wrap.innerHTML = `<div class="answer-choice">${mdToHtml(text)}</div><div class="meta">${role === 'user' ? 'Ваш ответ' : 'Пока нет ответа'} | <a href="#" onclick="event.preventDefault();" style="font-size:0.72rem;">Отметить вопрос</a></div>`;
  messages.appendChild(wrap);
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
                'messages': [
                    {'role': 'system', 'content': 'Ты — ассистент по учебе. Отвечай кратко, по делу, без лишних слов. Максимум 2-3 предложения. Не перечисляй длинные списки. Если вопрос по коду — дай только команду или пример без объяснений.'},
                    {'role': 'user', 'content': data['message']}
                ],
                'temperature': 0.5,
                'max_tokens': 1000
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
