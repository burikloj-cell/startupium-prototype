(() => {
  "use strict";
  const STORAGE_KEY = "startupium.demo.accounts.v1";
  const SESSION_KEY = "startupium.demo.session.v1";
  const $ = (selector, root=document) => root.querySelector(selector);
  const readAccounts = () => {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const showMessage = (form, message, type="error") => {
    const box = $("#form-message", form);
    if (!box) return;
    box.textContent = message;
    box.className = "form-message is-visible " + type;
  };
  const setBusy = (button, busy, label) => {
    button.disabled = busy;
    button.textContent = busy ? "Подождите…" : label;
  };
  const deriveHash = async (password, salt) => {
    if (!crypto?.subtle) throw new Error("Браузер не поддерживает безопасное хеширование. Открой сайт по HTTPS.");
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({name:"PBKDF2", salt, iterations:150000, hash:"SHA-256"}, key, 256);
    return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2,"0")).join("");
  };
  const randomSalt = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2,"0")).join("");
  };
  const fromHex = hex => new Uint8Array(hex.match(/.{2}/g).map(part => parseInt(part,16)));
  const register = $("#register-form");
  if (register) register.addEventListener("submit", async event => {
    event.preventDefault();
    const button = $('button[type="submit"]', register);
    const name = $("#name", register).value.trim();
    const email = $("#email", register).value.trim().toLowerCase();
    const password = $("#password", register).value;
    const confirm = $("#password-confirm", register).value;
    if (name.length < 2) return showMessage(register, "Укажи имя длиной не менее 2 символов.");
    if (!$("#email", register).validity.valid) return showMessage(register, "Проверь адрес электронной почты.");
    if (password.length < 8) return showMessage(register, "Пароль должен содержать минимум 8 символов.");
    if (password !== confirm) return showMessage(register, "Пароли не совпадают.");
    if (!$('[name="privacy"]', register).checked || !$('[name="terms"]', register).checked) return showMessage(register, "Подтверди согласие с условиями и обработкой данных.");
    if (readAccounts().some(account => account.email === email)) return showMessage(register, "Аккаунт с таким email уже существует. Попробуй войти.");
    setBusy(button, true, "Создать аккаунт");
    try {
      const salt = randomSalt();
      const passwordHash = await deriveHash(password, fromHex(salt));
      const accounts = readAccounts();
      accounts.push({name, email, salt, passwordHash, createdAt:new Date().toISOString()});
      localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
      sessionStorage.setItem(SESSION_KEY, email);
      showMessage(register, "Демо-аккаунт создан. Сейчас откроется главная страница.", "success");
      setTimeout(() => location.href = "index.html", 900);
    } catch (error) {
      showMessage(register, error?.message || "Не удалось создать аккаунт. Проверь настройки браузера.");
      setBusy(button, false, "Создать аккаунт");
    }
  });
  const login = $("#login-form");
  if (login) login.addEventListener("submit", async event => {
    event.preventDefault();
    const button = $('button[type="submit"]', login);
    const email = $("#email", login).value.trim().toLowerCase();
    const password = $("#password", login).value;
    if (!$("#email", login).validity.valid || !password) return showMessage(login, "Введи корректный email и пароль.");
    setBusy(button, true, "Войти");
    try {
      const account = readAccounts().find(item => item.email === email);
      if (!account) throw new Error("Аккаунт не найден в этом браузере. Сначала зарегистрируйся.");
      const candidate = await deriveHash(password, fromHex(account.salt));
      if (candidate !== account.passwordHash) throw new Error("Неверный email или пароль.");
      sessionStorage.setItem(SESSION_KEY, email);
      showMessage(login, "Вход выполнен. Сейчас откроется главная страница.", "success");
      setTimeout(() => location.href = "index.html", 700);
    } catch (error) {
      showMessage(login, error?.message || "Не удалось выполнить вход.");
      setBusy(button, false, "Войти");
    }
  });
})();