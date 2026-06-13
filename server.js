require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const LOG = path.join(__dirname, 'server.log');

function log(m) {
  const l = `[${new Date().toLocaleString('zh-TW')}] ${m}`;
  console.log(l);
  fs.appendFileSync(LOG, l + '\n');
}

fs.writeFileSync(LOG, '');
log('[READY] Server starting...');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: process.env.SESSION_SECRET || 'github-2026', resave: false, saveUninitialized: false }));

// Login page
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>已登入</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f6f8fa}
.c{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.12);padding:40px;text-align:center;max-width:420px;width:90%}
img{border-radius:50%;width:80px;height:80px;margin-bottom:12px}
.nm{font-size:20px;margin-bottom:4px}.sub{color:#57606a;font-size:14px;margin-top:4px}
.btn{display:inline-block;margin-top:16px;background:#6e7681;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none}
.btn:hover{background:#57606a}</style></head><body><div class="c">
<img src="${req.session.user.avatar_url || ''}" alt="">
<p class="nm">${req.session.user.name || req.session.user.login}</p>
<p class="sub">@${req.session.user.login}</p>
<a class="btn" href="/logout">登出</a></div></body></html>`);
  }
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>GitHub 登入</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f6f8fa}
.c{background:#fff;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.12);padding:40px;text-align:center;max-width:420px;width:90%}
h1{font-size:22px;margin-bottom:8px}p{color:#57606a;font-size:14px;margin-bottom:20px}
input{width:100%;padding:10px;border:1px solid #d0d7de;border-radius:6px;font-size:14px;margin-bottom:12px;box-sizing:border-box}
input:focus{outline:none;border-color:#0969da;box-shadow:0 0 0 3px rgba(9,105,218,.2)}
.btn{background:#24292f;color:#fff;border:none;padding:12px 24px;font-size:16px;border-radius:6px;cursor:pointer;width:100%}
.btn:hover{background:#1b1f23}.err{color:#cf222e;background:#ffebe9;padding:8px;border-radius:6px;margin-top:12px;font-size:13px;display:none}
.hint{font-size:12px;color:#57606a;margin-top:12px;line-height:1.5}
.hint a{color:#0969da}</style></head><body><div class="c">
<h1>GitHub 登入</h1>
<p>請輸入 GitHub Personal Access Token</p>
<form method="POST" action="/login" id="f">
<input type="password" name="token" placeholder="ghp_xxxxxxxxxxxx" required autocomplete="off">
<button class="btn" type="submit">登入</button>
</form>
<div class="err" id="err"></div>
<div class="hint">如何取得 Token？<br>
1. 前往 <a href="https://github.com/settings/tokens" target="_blank">GitHub Token 設定</a><br>
2. 點擊 "Generate classic token"<br>
3. 勾選 <b>read:user</b> 權限<br>
4. 複製 Token 貼到上方</div>
</div>
<script>const p=new URLSearchParams(window.location.search);if(p.get('e')){document.getElementById('err').textContent=decodeURIComponent(p.get('e'));document.getElementById('err').style.display='block'}</script>
</body></html>`);
});

// Login with PAT
app.post('/login', async (req, res) => {
  const token = req.body.token;
  log(`[LOGIN] Attempting with token: ${token ? token.substring(0,8)+'...' : 'EMPTY'}`);
  if (!token) return res.redirect('/?e=' + encodeURIComponent('請輸入 Token'));
  try {
    const r = await axios.get('https://api.github.com/user', {
      headers: { Authorization: 'Bearer ' + token, 'User-Agent': 'OP-GB-APP' },
      timeout: 10000
    });
    log(`[LOGIN] SUCCESS: ${r.data.login} (${r.data.name || ''})`);
    req.session.user = r.data;
    req.session.token = token;
    res.redirect('/');
  } catch (e) {
    const msg = e.response?.status === 401 ? 'Token 無效或已過期' :
                e.response?.status === 403 ? 'Token 權限不足 (需要 read:user)' :
                e.code === 'ECONNABORTED' ? '連線逾時' : '無法連線到 GitHub API';
    log(`[LOGIN] FAIL: ${e.response?.status || e.message}`);
    res.redirect('/?e=' + encodeURIComponent(msg));
  }
});

// API
app.get('/api/user', (req, res) => {
  req.session.user ? res.json({ user: req.session.user }) : res.status(401).json({ error: 'Not logged in' });
});
app.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/')); });

app.listen(PORT, () => {
  log(`[READY] Server: http://localhost:${PORT}`);
});
