
const signupForm = document.getElementById("signupForm");

const message = document.getElementById("message");

const passwordInput = document.getElementById("password");

const togglePassword = document.getElementById("togglePassword");

// Show / hide password
togglePassword.addEventListener("click", () => {

    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";

    togglePassword.textContent = isPassword ? "Hide" : "Show";

});

// Signup form
signupForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();

    const email = document.getElementById("email").value.trim();

    const password = passwordInput.value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const signupButton = signupForm.querySelector(".login-button");

    message.textContent = "";

    message.style.color = "#ff8585";

    // Validate password
    if (password.length < 8) {

        message.textContent =
            "Password must contain at least 8 characters.";

        return;
    }

    if (password !== confirmPassword) {

        message.textContent = "Passwords do not match.";

        return;
    }

    signupButton.disabled = true;

    signupButton.textContent = "Creating account...";

    try {

        const { data, error } =
            await supabaseClient.auth.signUp({

                email: email,

                password: password,

                options: {

                    data: {
                        full_name: fullName
                    },

                    emailRedirectTo:
                        window.location.origin + "/login.html"

                }

            });

        if (error) {
            throw error;
        }

        // If email confirmation is disabled,
        // Supabase may immediately create a session.
        if (data.session) {

            message.style.color = "#8ee5b0";

            message.textContent =
                "Account created successfully! Redirecting...";

            window.location.replace("/");

        } else {

            message.style.color = "#8ee5b0";

            message.textContent =
                "Account created! Please check your email and confirm your account before signing in.";

            signupForm.reset();

        }

    } catch (error) {

        message.style.color = "#ff8585";

        message.textContent = error.message;

    } finally {

        signupButton.disabled = false;

        signupButton.innerHTML =
            'Create Account <span>→</span>';

    }

});

// Clear any previous login session before opening login page
document.getElementById("signInLink").addEventListener("click", async (event) => {

    event.preventDefault();

    await supabaseClient.auth.signOut();

    window.location.href = "login.html";

});
