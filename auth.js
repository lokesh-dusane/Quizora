(function(){
	const API_BASE = 'https://quizora1.onrender.com/api';

	function saveAuth(token, user){
		try {
			localStorage.setItem('auth_token', token);
			localStorage.setItem('auth_user', JSON.stringify(user));
		} catch (_) {}
	}

	function getToken(){
		try { return localStorage.getItem('auth_token') || ''; } catch (_) { return ''; }
	}

	function getUser(){
		try { return JSON.parse(localStorage.getItem('auth_user')||'null'); } catch (_) { return null; }
	}

	function logout(){
		try {
			localStorage.removeItem('auth_token');
			localStorage.removeItem('auth_user');
		} catch (_) {}
	}

	async function apiGet(path){
		const res = await fetch(`${API_BASE}${path}`, {
			headers: { 'Authorization': `Bearer ${getToken()}` }
		});
		if(!res.ok){
			const err = await res.json().catch(()=>({ error: 'Request failed' }));
			throw new Error(err.error || 'Request failed');
		}
		return res.json();
	}

	async function apiPost(path, body){
		const res = await fetch(`${API_BASE}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if(!res.ok){
			const err = await res.json().catch(()=>({ error: 'Request failed' }));
			throw new Error(err.error || 'Request failed');
		}
		return res.json();
	}

	function initialsFromName(name, email){
		const source = (name && name.trim()) || (email && email.trim()) || 'U';
		const parts = source.split(/\s+/).filter(Boolean);
		if(parts.length === 1){
			return parts[0].slice(0,1).toUpperCase();
		}
		return (parts[0].slice(0,1) + parts[1].slice(0,1)).toUpperCase();
	}

	function isLoginPage(){
		const page = (location.pathname || '').toLowerCase();
		return page.endsWith('/login.html') || page === '/login.html' || page.endsWith('/login');
	}

	function isHomePage(){
		const path = (location.pathname || '').toLowerCase();
		return path.endsWith('/') || path.endsWith('/index.html') || path === '/index.html';
	}

	const protectedPages = ['quiz.html','computer.html','jee.html','gate.html'];
	function isProtectedPage(){
		const path = (location.pathname || '').toLowerCase();
		return protectedPages.some(p => path.endsWith('/'+p));
	}

	function applyNavbarState(){
		const loginLink = document.querySelector('a.get-started');
		const userMenu = document.getElementById('user-menu');
		const userBadge = document.getElementById('user-badge');
		const userAvatar = document.getElementById('user-avatar');
		const logoutBtn = document.getElementById('logout-btn');
		const dropdown = document.getElementById('user-dropdown');
		const dropdownIdentity = document.getElementById('dropdown-identity');
		const u = getUser();
		if(u){
			if(userMenu) userMenu.style.display = 'inline-flex';
			if(userBadge) userBadge.textContent = u.name || u.email;
			if(userAvatar) userAvatar.textContent = initialsFromName(u.name, u.email);
			if(dropdownIdentity) dropdownIdentity.textContent = (u.name || u.email);
			if(loginLink) loginLink.style.display = 'none';
			if(logoutBtn){
				logoutBtn.onclick = function(){
					logout();
					window.location.href = 'index.html';
				};
			}
			if(userMenu){
				userMenu.onclick = function(){
					if(!dropdown) return;
					dropdown.style.display = dropdown.style.display === 'none' || dropdown.style.display === '' ? 'block' : 'none';
				};
			}
		}else{
			if(userMenu) userMenu.style.display = 'none';
			if(loginLink) loginLink.style.display = 'inline-block';
		}
	}

	function attachProtectedLinkIntercept(){
		if(getToken()) return; // only intercept when not authenticated
		const anchors = document.querySelectorAll('a[href]');
		anchors.forEach(a => {
			try {
				const href = (a.getAttribute('href')||'').toLowerCase();
				if(!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
				if(href.endsWith('login.html') || href.endsWith('index.html')) return;
				const isProtected = protectedPages.some(p => href.endsWith('/'+p) || href.endsWith(p) || href.includes(p+'#'));
				if(isProtected){
					a.addEventListener('click', function(e){
						e.preventDefault();
						alert('Please sign in to access this section.');
						window.location.href = 'login.html';
					});
				}
			} catch(_){}
		});
	}

	function attachHandlers(){
		applyNavbarState();

		// Page guard: allow homepage always; protect only specific pages when not authenticated
		if(!getToken() && isProtectedPage() && !isLoginPage()){
			window.location.href = 'login.html';
			return;
		}

		attachProtectedLinkIntercept();

		const loginForm = document.getElementById('login');
		const registerForm = document.getElementById('register');

		if(loginForm){
			loginForm.addEventListener('submit', async function(e){
				e.preventDefault();
				const emailInput = document.getElementById('email');
				const passwordInput = document.getElementById('password');
				const email = emailInput ? emailInput.value.trim() : '';
				const password = passwordInput ? passwordInput.value : '';
				if(!email || !password){ alert('Please enter email and password'); return; }
				try {
					const data = await apiPost('/auth/login', { email, password });
					saveAuth(data.token, data.user);
					window.location.href = 'index.html';
				} catch (err){
					alert(err.message);
				}
			});
		}

		if(registerForm){
			registerForm.addEventListener('submit', async function(e){
				e.preventDefault();
				const inputs = registerForm.querySelectorAll('input');
				let name = '', email = '', password = '', confirm = '';
				inputs.forEach((inp)=>{
					const ph = (inp.getAttribute('placeholder')||'').toLowerCase();
					if(ph.includes('full name')) name = inp.value.trim();
					else if(ph.includes('email')) email = inp.value.trim();
					else if(ph.includes('create password')) password = inp.value;
					else if(ph.includes('confirm password')) confirm = inp.value;
				});
				if(!name || !email || !password){ alert('Please fill all fields'); return; }
				if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ alert('Please enter a valid email'); return; }
				if(password !== confirm){ alert('Passwords do not match'); return; }
				try {
					const data = await apiPost('/auth/register', { name, email, password });
					saveAuth(data.token, data.user);
					window.location.href = 'index.html';
				} catch (err){
					alert(err.message);
				}
			});
		}
	}

	window.Auth = { getUser, getToken, logout, apiGet };

	document.addEventListener('DOMContentLoaded', attachHandlers);
})();
