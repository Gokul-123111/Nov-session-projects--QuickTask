
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const message = document.getElementById("message");

// Show / hide password
togglePassword.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "Hide" : "Show";
});

// Login using the credentials entered by the user
loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value;

    const loginButton = loginForm.querySelector(".login-button");

    message.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            throw error;
        }

        message.style.color = "#8ee5b0";
        message.textContent = "Login successful! Redirecting...";

        window.location.replace("/");

    } catch (error) {
        message.style.color = "#ff8585";
        message.textContent = error.message;

    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML = 'Sign in <span>→</span>';
    }
});
