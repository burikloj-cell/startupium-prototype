(() => {
  "use strict";
  const STORAGE_KEY = "startupium.demo.accounts.v1";
  const SESSION_KEY = "startupium.demo.session.v1";
  const $ = (selector, root = document) => root.querySelector(selector);

  const readAccounts = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const showMessage = (form, message, type = "error") => {
    const box = $("#form-message", form);
    if (!box) return;
    box.textContent = message;
    box.className = "form-message is-visible " + type;
    box.setAttribute("role", type === "error" ? "alert" : "status");
  };

  const setBusy = (button, busy, label) => {
    button.disabled = busy;
    button.textContent = busy ? "Подождите…" : label;
  };

  const requireCrypto = () => {
    if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
      throw new Error("Браузер не поддерживает Web Crypto. Открой сайт по HTTPS в современном браузере.");
    }
  };

  const deriveHash = async (password, salt) => {
    requireCrypto();
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
      key,
      256
    );
    return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
  };

  const randomSalt = () => {
    requireCrypto();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  };

  const fromHex = hex => {
    if (typeof hex !== "string" || !/^(?:[0-9a-f]{2})+$/i.test(hex)) {
      throw new Error("Данные аккаунта повреждены. Удали демо-аккаунт из хранилища браузера и зарегистрируйся снова.");
    }
    return new Uint8Array(hex.match(/.{2}/g).map(part => parseInt(part, 16)));
  };

  const equalHashes = (left, right) => {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index += 1) {
      difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return difference === 0;
  };

  const registerForm = $("#register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async event => {
      event.preventDefault();
      const button = $('button[type="submit"]', registerForm);
      const name = $("#name", registerForm).value.trim();
      const email = $("#email", registerForm).value.trim().toLowerCase();
      const password = $("#password", registerForm).value;
      const confirmation = $("#password-confirm", registerForm).value;

      if (name.length < 2) return showMessage(registerForm, "Укажи имя длиной не менее 2 символов.");
      if (!$("#email", registerForm).validity.valid) return showMessage(registerForm, "Проверь адрес электронной почты.");
      if (password.length < 8) return showMessage(registerForm, "Пароль должен содержать минимум 8 символов.");
      if (password !== confirmation) return showMessage(registerForm, "Пароли не совпадают.");
      if (!$('[name="privacy"]', registerForm).checked || !$('[name="terms"]', registerForm).checked) {
        return showMessage(registerForm, "Подтверди ознакомление с информацией и условиями.");
      }

      const accounts = readAccounts();
      if (accounts.some(account => account.email === email)) {
        return showMessage(registerForm, "Аккаунт с таким email уже существует. Попробуй войти.");
      }

      setBusy(button, true, "Создать аккаунт");
      try {
        const salt = randomSalt();
        const passwordHash = await deriveHash(password, fromHex(salt));
        accounts.push({ name, email, salt, passwordHash, createdAt: new Date().toISOString() });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
        sessionStorage.setItem(SESSION_KEY, email);
        showMessage(registerForm, "Демо-аккаунт создан. Сейчас откроется главная страница.", "success");
        window.setTimeout(() => { window.location.href = "index.html"; }, 850);
      } catch (error) {
        showMessage(registerForm, error?.message || "Не удалось создать аккаунт. Проверь настройки браузера.");
        setBusy(button, false, "Создать аккаунт");
      }
    });
  }

  const loginForm = $("#login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      const button = $('button[type="submit"]', loginForm);
      const email = $("#email", loginForm).value.trim().toLowerCase();
      const password = $("#password", loginForm).value;

      if (!$("#email", loginForm).validity.valid || !password) {
        return showMessage(loginForm, "Введи корректный email и пароль.");
      }

      setBusy(button, true, "Войти");
      try {
        const account = readAccounts().find(item => item.email === email);
        if (!account) throw new Error("Аккаунт не найден в этом браузере. Сначала зарегистрируйся.");
        const candidate = await deriveHash(password, fromHex(account.salt));
        if (!equalHashes(candidate, account.passwordHash)) {
          throw new Error("Неверный email или пароль.");
        }
        sessionStorage.setItem(SESSION_KEY, email);
        showMessage(loginForm, "Вход выполнен. Сейчас откроется главная страница.", "success");
        window.setTimeout(() => { window.location.href = "index.html"; }, 700);
      } catch (error) {
        showMessage(loginForm, error?.message || "Не удалось выполнить вход.");
        setBusy(button, false, "Войти");
      }
    });
  }
})();
