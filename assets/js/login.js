// Como o site e a API agora rodam na mesma porta (8080), usamos caminhos relativos.
const API_BASE = "/api/v1";

function togglePassword() {
    const input = document.getElementById('password');
    const icon = document.getElementById('eyeIcon');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    icon.className = isHidden ? 'bi bi-eye-slash' : 'bi bi-eye';
}

document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMsg');
    const errorText = document.getElementById('errorText');
    const loginBtn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');

    // Reset error
    errorDiv.classList.add('d-none');

    // Loading state
    loginBtn.disabled = true;
    btnText.classList.add('d-none');
    btnSpinner.classList.remove('d-none');

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || 'Usuário ou senha inválidos.');
        }

        // Persiste sessão em sessionStorage E localStorage (garante cross-page)
        sessionStorage.setItem('sg_token', data.token);
        sessionStorage.setItem('sg_role', data.role);
        sessionStorage.setItem('sg_display_name', data.display_name);
        sessionStorage.setItem('sg_avatar', data.avatar);
        localStorage.setItem('sg_token', data.token);
        localStorage.setItem('sg_role', data.role);
        localStorage.setItem('sg_display_name', data.display_name);
        localStorage.setItem('sg_avatar', data.avatar);

        // Redireciona para o dashboard
        window.location.href = 'index.html';

    } catch (err) {
        errorText.textContent = err.message;
        errorDiv.classList.remove('d-none');

        loginBtn.disabled = false;
        btnText.classList.remove('d-none');
        btnSpinner.classList.add('d-none');
    }
});
